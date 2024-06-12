import axios from 'axios';
import mysql from 'mysql2';
import { deobfuscate } from './deobfuscate.js';

const conn = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	database: 'vidsrc'
});
conn.connect(err => {
	if (err) throw err
	console.log('Connected to database')
});

// (async () => {
// 	for (let i = 45; i < 60; i++) {
// 		console.log(`Scraping Page ${i}`)
// 		let resp = await axios.get(`https://vidsrc.to/vapi/movie/add/${i}`).then(resp => resp.data).catch(err => console.log(err));
// 		for (let item of await resp.result.items) {
// 			let sql = `INSERT INTO movies (imdb, tmdb, title) VALUES ('${item.imdb_id}', ${item.tmdb_id}, '${item.title}')`
// 			conn.query(sql, (err, result) => {
// 				if (err & err != "ER_DUP_ENTRY") throw err;
// 			});
// 			await new Promise(resolve => setTimeout(resolve, 50));
// 		}
// 		if (i % 10 === 0) await new Promise(resolve => setTimeout(resolve, 500))
// 		if (i % 100 === 0) await new Promise(resolve => setTimeout(resolve, 2000))
// 	}
// 	console.log('done')
// })()

(async () => {
	let cache = { lastToken: 0, ftoken: null, key1: null, key2: null, lastKey: '0' };
	let movies = await new Promise((resolve, reject) => {
		conn.query('SELECT * FROM movies WHERE vid IS NULL ORDER BY id DESC', (err, result) => {
			if (err) reject(err); resolve(result);
		})
	});
	let j = 0;
	for (let movie of movies) {
		console.log(`Scraping ${movie.title} - ${movie.tmdb}`)
		if (Date.now() - cache.lastToken > 120000) {
			let token = await axios.get(`https://vidplay.site/futoken`).then(resp => resp.data).catch(err => null);
			cache.lastToken = Date.now(); cache.ftoken = /k='([^']+)'/.exec(token)[1];
		}
		let resp = await axios.get(`https://vidsrc.to/embed/movie/${movie.tmdb}`).then(resp => resp.data).catch(err => null);
		if (!resp) continue;
		let vid = /data-id="([^"]+)"/.exec(resp)[1];
		let sources = await axios.get(`https://vidsrc.to/ajax/embed/episode/${vid}/sources`).then(resp => resp.data).catch(err => null);
		let vidstream = sources.result[0].id.replaceAll('=', '');
		let src = await axios.get(`https://vidsrc.to/ajax/embed/source/${vidstream}`).then(resp => resp.data).catch(err => null);
		let decSource = dec('8z5Ag5wgagfsOuhz', src.result.url); // vidsrc has same key
		let decURL = new URL(decSource), source = { path: decURL.pathname.split('/').pop() };
		if (Date.now() - cache.lastKey > 200000) {
			try {
				cache = await updateKeys(cache);
				if (!cache) return console.error('Failed to update keys');
			} catch (err) {
				return console.error(err, err.stack);
			}
		}
		let k = cache.ftoken, a = [k];
		let v = fenc(cache.key1, source.path);
		v = fenc(cache.key2, v);
		v = _fenc(v).replace(/\//g, "_");
		for (var i = 0; i < v.length; i++)
			a.push(k.charCodeAt(i % k.length) + v.charCodeAt(i));
		let search = decURL.search.split('&ads')[0];
		conn.query(`UPDATE movies SET vid = '${vid}', vidstream = '${vidstream}' WHERE id = ${movie.id}`, (err, result) => {
			if (err) throw err; 
		});
		let info = await axios.get(`https://vidplay.site/mediainfo/${a.join(',')}${search}`, {
			headers: { Referer: `https://vidplay.site/e/${source.path}` }
		}).then(resp => resp.data).catch(err => null);
		if (!info.result.sources) continue;
		let sourceURL = new URL(info.result.sources[0].file);
		source.file = sourceURL.pathname.split('/')[2];
		source._file = info.result.sources?.[0]?.file;
		source.thumbs = info.result.tracks?.[0]?.file;
		if (!source.thumbs || !source) console.log(info);
		source.subs = decURL.searchParams.get('subs.info');
		conn.query(`UPDATE movies SET source = '${JSON.stringify(source)}' WHERE id = ${movie.id}`, (err, result) => {
			if (err) throw err;
		});
		if (j % 10 === 0) await new Promise(resolve => setTimeout(resolve, 500))
		await new Promise(resolve => setTimeout(resolve, 50));
		j++;
	}
})();

async function updateKeys(cache) {
	let js = await deobfuscate(`https://vidplay.site/assets/mcloud/min/embed.js?v=${+new Date}`)
	if (!js) return console.error('Failed to deobfuscate');
	let reg = /loading\(\);[\n\s]+var \w+ = (\w+)\((.*)\);\s+\w+ = \w+\((.*)\);/gm;
	let match = reg.exec(js);
	let first = match[2], second = match[3];
	let firstKeys = first.split(/[+,\(\)\s]+/g).slice(0, -1).filter(elm => !/[^"_a-z0-9]/i.test(elm));
	let secondKeys = second.split(/[+,\(\)\s]+/g).slice(0, -1).filter(elm => !/[^"_a-z0-9]/i.test(elm));
	if (firstKeys.length !== 1) {
		for (let i = 0; i < firstKeys.length; i++) {
			let regex = new RegExp(`var ${firstKeys[i]} = "(\\w+)";`, 'gm');
			firstKeys[i] = regex.exec(js)?.[1];
		}
	} else firstKeys = [firstKeys[0].replaceAll('"', '')]
	if (secondKeys.length !== 1) {
		for (let i = 0; i < secondKeys.length; i++) {
			let regex = new RegExp(`var ${secondKeys[i]} = "(\\w+)";`, 'gm');
			secondKeys[i] = regex.exec(js)?.[1];
		}
	} else secondKeys = [secondKeys[0].replaceAll('"', '')]
	cache.key1 = firstKeys.join('');
	cache.key2 = secondKeys.join('');
	cache.lastKey = Date.now();
	console.log(cache);
	return cache;
}

var zz = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function _dec(t) {
	if (((t = (t = (t = "".concat(t)).replace(/[ \t\n\f\r]/g, "")).length % 4 == 0 ? t.replace(/==?$/, "") : t).length) % 4 == 1 || /[^+/0-9A-Za-z]/.test(t)) {
	  return null;
	}
	for (var r, o = "", s = 0, u = 0, c = 0; c < t.length; c++) {
	  s = (s <<= 6) | (r = t[c], (r = zz.indexOf(r)) < 0 ? undefined : r);
	  if ((u += 6) === 24) {
		o = (o = (o += String.fromCharCode((s & 16711680) >> 16)) + String.fromCharCode((s & 65280) >> 8)) + String.fromCharCode(s & 255);
		s = u = 0;
	  }
	}
	if (12 === u) {
	  s >>= 4;
	  o += String.fromCharCode(s);
	} else if (u === 18) {
	  s >>= 2;
	  o = (o += String.fromCharCode((s & 65280) >> 8)) + String.fromCharCode(s & 255);
	}
	return o;
}

function _enc(t, n) {
	for (var i, r = [], o = 0, s = "", u = 0; u < 256; u++) {
	  r[u] = u;
	}
	for (u = 0; u < 256; u++) {
	  o = (o + r[u] + t.charCodeAt(u % t.length)) % 256;
	  i = r[u];
	  r[u] = r[o];
	  r[o] = i;
	}
	for (var u = 0, o = 0, c = 0; c < n.length; c++) {
	  i = r[u = (u + 1) % 256];
	  r[u] = r[o = (o + r[u]) % 256];
	  r[o] = i;
	  s += String.fromCharCode(n.charCodeAt(c) ^ r[(r[u] + r[o]) % 256]);
	}
	return s;
}

function dec(key, t) {
	t = _dec("".concat(t).replace(/_/g, "/").replace(/-/g, "+"));
	t = _enc(key, t);
	return decodeURIComponent(t);
}

function fenc(n, t) {
    for (var a, r = [], s = 0, k = "", m = 0; m < 256; m++) r[m] = m;
    for (m = 0; m < 256; m++) {
        s = (s + r[m] + n.charCodeAt(m % n.length)) % 256;
        a = r[m];
        r[m] = r[s];
        r[s] = a;
    }
    for (var m = 0, s = 0, i = 0; i < t.length; i++) {
        a = r[(m = (m + 1) % 256)];
        r[m] = r[(s = (s + r[m]) % 256)];
        r[s] = a;
        k += String.fromCharCode(t.charCodeAt(i) ^ r[(r[m] + r[s]) % 256]);
    }
    return k;
}
function _fenc(n) {
    a = 0;
    for (; a < n.length; a++)
        if (n.charCodeAt(a) > 255) return null;
    for (var s = "", a = 0; a < n.length; a += 3) {
        var u = [undefined, undefined, undefined, undefined];
        u[0] = n.charCodeAt(a) >> 2;
        u[1] = (n.charCodeAt(a) & 3) << 4;
        if (n.length > a + 1) {
            u[1] |= n.charCodeAt(a + 1) >> 4;
            u[2] = (n.charCodeAt(a + 1) & 15) << 2;
        }
        if (n.length > a + 2) {
            u[2] |= n.charCodeAt(a + 2) >> 6;
            u[3] = n.charCodeAt(a + 2) & 63;
        }
        for (var i = 0; i < u.length; i++)
            s += "undefined" == typeof u[i] ? "=" : (function (k) { if (k >= 0 && k < 64) return zz[k]; })(u[i]);
    }
    return s;
}