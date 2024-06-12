import Helper from "../helpers/helper.js";
import Mapping from "../helpers/mapping.js";
import { load } from "cheerio";
import { Config, Episode, Media } from "../helpers/models.js";
import Redis from "../helpers/redis.js";

export default class Vidsrc {

	static servers = ['vidplay', 'mycloud', 'filemoon'];

	static tokenHosts = ['vid41c.site', 'mcloud.bz'];

	static serverHosts(server = 'vidplay') {
		let hosts = { 
			vidplay: ['vidplay.online'], 
			mycloud: ['mcloud.bz']
		}
		return hosts[server][Math.floor(Math.random() * hosts[server].length)];
	}

	static async scrapeSource(embed, server = 'vidplay', fuToken = null) {
		embed = new URL(embed); let search = embed.searchParams;
		let subs = search.get('sub.info') || null, thumbnails, source;
		if (server !== 'filemoon') {
			fuToken = fuToken || await this.fuToken()
			let fileId = embed.pathname.split('/').pop();
			let endpoint = await this.createRequest(fileId, server, fuToken);
			endpoint = `https://${this.serverHosts(server)}/${endpoint}/${embed.search}`;
			let resp = await Helper.fetch(endpoint, {
				responseType: 'json', headers: { 'x-requested-with': 'XMLHttpRequest', referer: embed.href }
			}).then(x => x.body).catch(null);
			// console.log(await this.fuToken(), await Redis.del('fuToken'))
			if (!resp?.result?.sources) return await Redis.del('fuToken'), { error: 500 }
			resp = resp.result, source = resp.sources[0].file;
			thumbnails = resp.tracks.filter(x => x.kind.includes('thumb')).map(x => x.file)[0]
		} else {
			let endpoint = `${embed.origin}${embed.pathname}`
			let resp = await Helper.fetch(endpoint, {}, 'm3u8').then(x => x).catch(null);
			let evalCode = /eval\(([\w\W]+)\)/gm.exec(resp?.body)[1];
			evalCode = Helper.evalDecode(`(${evalCode.replace(/return \w+}/gm, '$&)')}`);
			let sources = evalCode.match(/file:"([^"]+)"/gm).map(x => x.split('"')[1]);	
			let allowedParams = ['t', 's', 'e', 'srv', 'sp']
			source = new URL(sources[0]), thumbnails = `${embed.origin}/${sources[1]}`
			source.searchParams.forEach((v, k) => {
				if (!allowedParams.includes(k)) source.searchParams.delete(k);
			}), source = source.href;
		}
			
		if (subs) subs = await Helper.fetch(subs, {
			responseType: 'json', headers: { 'x-requested-with': 'XMLHttpRequest' }
		}).then(x => x?.body).catch(null);
		return {
			source, thumbnails,
			subtitles: subs?.[0]?.file ? subs : null
		}
	}

	static async scrapeServer(serverId) {
		let endpoint = `https://vidsrc.to/ajax/embed/source/${serverId}`;
		let resp = await Helper.fetch(endpoint, {
			headers: { 'x-requested-with': 'XMLHttpRequest' }, responseType: 'json'
		}).then(x => x).catch(null);
		if (resp?.body?.status !== 200) return { error: 402 }
		return { embed: await this.decryptServer(resp?.body?.result?.url) || null }
	}

	static async scrapeServers(episodeId) {
		let endpoint = `https://vidsrc.to/ajax/embed/episode/${episodeId}/sources`;
		let resp = await Helper.fetch(endpoint, {
			headers: { 'x-requested-with': 'XMLHttpRequest' }, responseType: 'json'
		}).then(x => x).catch(null);
		if (resp?.body?.status !== 200) return { error: 403 }
		return resp.body.result.map(x => ({ 
			[x.title.toLowerCase()]: x.id 
		})).reduce((a, b) => ({ ...a, ...b }), {});
	}

	static async scrapeEpisodes(mediaId, media) {
		let type = media.type, prefix = media.type === 'movie' ? 'm' : 't';
		let endpoint = `https://vidsrc.to/embed/${type}/${mediaId}`;
		let resp = await Helper.fetch(endpoint).then(x => x?.body).catch(null);
		if (!resp) return [];
		let $ = load(resp), seasons = $('.episodes'), episodes = [];
		if (type === 'movie') {
			let episode = seasons.find('[data-id]');
			let sourceId = episode.attr('data-id');
			episodes = [{ season: 1, episode: 1, sourceId }];
		}
		for (let i in seasons) {
			if (isNaN(i)) continue;
			let season = seasons.eq(i).attr('data-id');
			if (isNaN(season)) season = +i + 1;
			let _episodes = seasons.eq(i).find('[data-id]');
			for (let j in _episodes) {
				if (isNaN(j)) continue; season = parseInt(season);
				let sourceId = _episodes.eq(j).attr('data-id');
				let title = _episodes.eq(j).text().trim();
				let episode = title.split(':')[0].split(' ').pop();
				title = title.split(':').slice(1).join(':').trim();
				if (isNaN(episode) || !episode) episode = +j + 1;
				episodes.push({ season, episode, title, sourceId });
			}
		}
		return episodes.forEach(async ep => {
			let id = `${prefix}:${media.tmdb}:${ep.season}:${ep.episode}`;
			await Episode.findOneAndUpdate({ id }, { 
				vidsrc: { id: ep.sourceId }, updated: +Date.now()
			}, { upsert: true, new: true });
		})
	}

	static async scrapeMedia(id, type) {
		try {
			let endpoint = `https://vidsrc.to/embed/${type}/${id}`, vidsrc = { id };
			let resp = await Helper.fetch(endpoint).then(x => x).catch(null);
			if (!resp?.body) return { error: 404, message: 'Media not found' };
			let $ = load(resp.body), [title, year] = $('title').text().split(' (');
			year = year?.replace(')', '') ?? null; let tmdb = id;
			let media = await Mapping.mapMedia({ title, year, type, tmdb }, { vidsrc })
			if (media?.tmdb) return await this.scrapeEpisodes(vidsrc.id, media);
				else return { error: 404, message: 'Media not found.' }
		} catch (err) {
			return { error: 501, message: err.message }
		}
	}

	static async scrapePages(type, start = 1, end = 1) {
		for (let i = start; i <= end; i++) {
			console.log('\x1b[36m%s\x1b[0m', `#VS-Scraping Page ${i}`)
			let url =`https://vidsrc.to/vapi/${type}/add/${i}`
			let resp = await Helper.fetch(url, { responseType: 'json' }).then(x => x.body).catch(null);
			if (!resp?.result?.items) return { error: 404, message: 'Page not found' };
			for (let media of resp.result.items) {
				let title = media.title.split(' ('), year = +title.pop().replace(')', '');
				let vidsrc = { id: media.tmdb_id }, type = media.type; title = title[0]
				if (!vidsrc.id || await Media.exists({ 
					vidsrc: { $exists: true }, 'vidsrc.id': vidsrc.id, type
				}) || !year) return; // Skip if invalid or already exists
				media = await Mapping.mapMedia({ title, year, type, tmdb: media?.tmdb_id }, { vidsrc })
				if (!media.tmdb) return; // Skip if no tmdb id
				await this.scrapeEpisodes(vidsrc.id, media);
				await new Promise(r => setTimeout(r, 100));
			}
			if (i > 1) await new Promise(r => setTimeout(r, 1000));
		}
	}

	static async fuToken() {
		return await Redis.get('fuToken', 60 * 10, async () => {
			let tokenHost = this.tokenHosts[Math.floor(Math.random() * this.tokenHosts.length)]
			let resp = await Helper.fetch(`https://${tokenHost}/futoken`, {
				headers: { referer: `https://${tokenHost}/e/` }
			});
			return /var k='([^']+)'/gm.exec(resp?.body)[1]
		})
	}

	static async decryptServer(url) {
		let key = (await Config.findOne({ key: 'vidsrc_keys' })).value[1];

		const parse=b=>{if(1==(b=0==(b=(b="".concat(b)).replace(/[\t\n\f\r]/g,"")).length%4?b.replace(/==?$/,""):b).length%4||/[^+/0-9A-Za-z]/.test(b))return null;for(var c,d="",f=0,g=0,h=0;h<b.length;h++)f=(f<<=6)|(c=b[h],0>(c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(c))?void 0:c),24==(g+=6)&&(d=(d=(d+=String.fromCharCode((16711680&f)>>16))+String.fromCharCode((65280&f)>>8))+String.fromCharCode(255&f),f=g=0);return 12==g?(f>>=4,d+=String.fromCharCode(f)):18===g&&(f>>=2,d=(d+=String.fromCharCode((65280&f)>>8))+String.fromCharCode(255&f)),d},decrypt=(b,c)=>{for(var d,g=[],e=0,i="",j=0;256>j;j++)g[j]=j;for(j=0;256>j;j++)e=(e+g[j]+b.charCodeAt(j%b.length))%256,d=g[j],g[j]=g[e],g[e]=d;for(var j=0,e=0,k=0;k<c.length;k++)d=g[j=(j+1)%256],g[j]=g[e=(e+g[j])%256],g[e]=d,i+=String.fromCharCode(c.charCodeAt(k)^g[(g[j]+g[e])%256]);return i};url=parse(url.replaceAll("_","/").replaceAll("-","+"));

		return decodeURIComponent(decrypt(key, url));
	}

	static async createRequest(fileId, server = 'vidplay', fuToken) {
		if (['vidplay', 'mycloud'].includes(server)) {
			let keys = (await Config.findOne({ key: 'vidplay_keys' })).value

			function enc(r,o){for(var e,t=[],f=0,n='',a=0;a<256;a++)t[a]=a;for(a=0;a<256;a++)f=(f+t[a]+r.charCodeAt(a%r.length))%256,e=t[a],t[a]=t[f],t[f]=e;for(var a=0,f=0,h=0;h<o.length;h++)e=t[a=(a+1)%256],t[a]=t[f=(f+t[a])%256],t[f]=e,n+=String.fromCharCode(o.charCodeAt(h)^t[(t[a]+t[f])%256]);return n}

			function parse(r){for(r=''.concat(r),t=0;t<r.length;t++)if(255<r.charCodeAt(t))return null;for(var o='',t=0;t<r.length;t+=3){var e=[void 0,void 0,void 0,void 0];e[0]=r.charCodeAt(t)>>2,e[1]=(3&r.charCodeAt(t))<<4,r.length>t+1&&(e[1]|=r.charCodeAt(t+1)>>4,e[2]=(15&r.charCodeAt(t+1))<<2),r.length>t+2&&(e[2]|=r.charCodeAt(t+2)>>6,e[3]=63&r.charCodeAt(t+2));for(var n=0;n<e.length;n++)o+=void 0===e[n]?'=':function(r){if(0<=r&&r<64)return'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[r]}(e[n])}return o}

			let hash = enc(keys[1], enc(keys[0], fileId)), a = [fuToken];
			hash = parse(hash).replace(/\//g, '_');

			for (var i = 0; i < hash.length; i++)
				a.push(fuToken.charCodeAt(i % fuToken.length) + hash.charCodeAt(i));
			return `mediainfo/${a.join(',')}`;
		}
	}
}
