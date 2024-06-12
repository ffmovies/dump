import Helper from "../helpers/helper.js";
import Mapping from "../helpers/mapping.js";
import { load } from "cheerio";
import { Config, Episode, Media } from "../helpers/models.js";

export default class Fmovies {

	static servers = ['vidplay', 'mycloud', 'filemoon'];

	static tokenHosts = ['vidplay.online', 'mcloud.bz'];

	static serverHosts(server = 'vidplay') {
		let hosts = { 
			vidplay: ['vidplay.online'], 
			mycloud: ['mcloud.bz']
		}
		return hosts[server][Math.floor(Math.random() * hosts[server].length)];
	}
	
	static randomHost(type) {
		let sources = {
			list: ['fmoviesz.to'],
			servers: ['fmoviesz.to', 'flixhq.bz', 'fbox.to', 'movies7.to', 'bflix.to']
		}
		return sources[type][Math.floor(Math.random() * sources[type].length)];
	}

	static async scrapeSource(embed, server = 'vidplay', fuToken = null) {
		embed = new URL(embed); let search = embed.searchParams;
		fuToken = fuToken || await this.fuToken()
		let fileId = embed.pathname.split('/').pop();
		let subs = search.get('sub.info') || null;
		let endpoint = await this.createRequest(fileId, server, fuToken);
		endpoint = `https://${this.serverHosts(server)}/${endpoint}${embed.search}`;
		let resp = await Helper.fetch(endpoint, {
			responseType: 'json', headers: { 'x-requested-with': 'XMLHttpRequest', referer: embed.href }
		}).then(x => x.body).catch(console.log);
		if (!resp?.result?.sources) return { error: 500 }
		if (subs) subs = await Helper.fetch(subs, {
			responseType: 'json', headers: { 'x-requested-with': 'XMLHttpRequest' }
		}, 'fmovies').then(x => x?.body).catch(console.log);
		return {
			source: resp.result.sources[0].file,
			thumbnails: resp.result.tracks.filter(x => x.kind === 'thumbnails').map(x => x.file)[0],
			subtitles: subs?.[0]?.file ? subs : null
		}
	}

	static async scrapeServer(serverId) {
		let base = `https://${this.randomHost('servers')}/ajax/server/${serverId}`;
		let vrf = encodeURIComponent(await this.vrfToken(serverId));
		let resp = await Helper.fetch(`${base}?vrf=${vrf}`, {
			headers: { 'x-requested-with': 'XMLHttpRequest' }, responseType: 'json'
		}, 'fmovies').then(x => x).catch(console.log);
		if (!resp.statusCode === 200) return { error: 403 }
		let embed = await this.decryptServer(resp.body.result?.url) || null
		return { embed, skips: resp.body.result.skip_data }
	}

	static async scrapeServers(episodeId) {
		let base = `https://${this.randomHost('servers')}/ajax/server/list`;
		let vrf = encodeURIComponent(await this.vrfToken(episodeId));
		let resp = await Helper.fetch(`${base}/${episodeId}?vrf=${vrf}`, {
			headers: { 'x-requested-with': 'XMLHttpRequest' }, responseType: 'json'
		}, 'fmovies').then(x => x).catch(console.log);
		if (!resp?.statusCode === 200) return { error: 403 }
		let $ = load(unescape(resp.body.result));
		return $('[data-link-id]').toArray().map(x => {
			let title = $(x).text().toLowerCase().trim();
			title = this.servers.find(s => title.includes(s)) || title;
			return { [title]: $(x).data('link-id') }
		}).reduce((a, b) => Object.assign(a, b), {});
	}

    static async scrapePage(url) {
		let resp = await Helper.fetch(url, 'fmovies', null, 2500).then(x => x).catch(console.log);
		let $ = load(resp.body), items = $(".movies .item"), chunks = 10;
		for (let i = 0; i < items.length; i += chunks) {
			let chunk = items.slice(i, i + chunks);
			await Promise.all(chunk.map(async (i, item) => {
				let fmovies = { 
					id: $(item).find('.poster a').data('tip')?.split('?')?.[0],
					slug: $(item).find('.poster a').attr('href'),
					quality: $(item).find('.quality').text().trim()
				}
				let metas = $(item).find('.meta span')
				let year = +metas.eq(0).text().trim()
				let type = metas.eq(1).text().trim() === 'MOVIE' ? 'movie' : 'tv'
				let title = $(item).find('.meta a').text().trim()
				if (!fmovies.id || await Media.exists({ 
					fmovies: { $exists: true }, 'fmovies.id': fmovies.id 
				}) || !year) return; // Skip if invalid or already exists
				
				let media = await Mapping.mapMedia({ title, year, type }, { fmovies })
				// if (!media.imdb) {
				// 	if (!(await _Media.exists({ source_id: fmovies.id })))
				// 		await _Media.create({ title, year, type, slug: fmovies.slug, source_id: fmovies.id })
				// 	return console.log(`FM-No match ${title} (${year})`)
				// }
				await this.scrapeEpisodes(fmovies.id).then(episodes => {
					episodes.forEach(async ep => {
						let id = `${media.imdb}:${ep.season}:${ep.episode}`;
						await Episode.findOneAndUpdate({ id }, {  
							title: ep.title, fmovies: ep.fmovies
						}, { upsert: true, new: true });
					})
				});
				// console.log(`FM-Scraped ${media.title} (${media.imdb})`)
			}));
			if (i > 0) await new Promise(r => setTimeout(r, 250));
			if (i > 20) await new Promise(r => setTimeout(r, 500));
		}
	}

	static async scrapeEpisodes(mediaId) {
		let ajax = `https://${this.randomHost('servers')}/ajax/episode/list/${mediaId}`
		let vrf = encodeURIComponent(await this.vrfToken(mediaId));
		let resp = await Helper.fetch(`${ajax}?vrf=${vrf}`, { 
			responseType: 'json', headers: { 'x-requested-with': 'XMLHttpRequest' }
		}, 'fmovies').then(x => x.body).catch(console.log);
		let $ = load(unescape(resp.result)), episodes = [], chunks = 10;
		for (let season of $('.episodes').toArray()) {
			let seasonId = $(season).data('season');
			for (let episode of $(season).find('li a').toArray()) {
				let fmovies = $(episode).data('id');
				let episodeId = $(episode).data('num');
				let title = $(episode).text().split(':').pop().trim();
				episodes.push({ fmovies, title, episode: episodeId, season: seasonId });
			}
		}

		return episodes;
	}

	static async scrapePages(start = 1, end = 1) {
		for (let i = start; i <= end; i++) {
			console.log('\x1b[36m%s\x1b[0m', `#FM-Scraping Page ${i}`)
			await this.scrapePage(`https://${this.randomHost('list')}/updated?page=${i}`);
			if (i > 1) await new Promise(r => setTimeout(r, 1000));
			if (i % 20 == 0) await new Promise(r => setTimeout(r, 2000));
		}
	}

	static async fuToken() {
		let tokenHost = this.tokenHosts[Math.floor(Math.random() * this.tokenHosts.length)]
		let resp = await Helper.fetch(`https://${tokenHost}/futoken`);
		return /var k='([^']+)'/gm.exec(resp.body)[1]
	}

	static async vrfToken(str) {
		let key = (await Config.findOne({ key: 'fmovies_keys' })).value[0];

		let t=encodeURIComponent(str);const W=a=>btoa(a).replace(/\//g,"_").replace(/\+/g,"-");function O(a,b){for(var c,d=[],f=0,g="",i=0;256>i;i++)d[i]=i;for(i=0;256>i;i++)f=(f+d[i]+a.charCodeAt(i%a.length))%256,c=d[i],d[i]=d[f],d[f]=c;for(var i=0,f=0,j=0;j<b.length;j++)c=d[i=(i+1)%256],d[i]=d[f=(f+d[i])%256],d[f]=c,g+=String.fromCharCode(b.charCodeAt(j)^d[(d[i]+d[f])%256]);return g}t=W(O(key,t));for(var s,o=(t=W(t),t=W(t=t.split("").reverse().join("")),""),u=0;u<t.length;u++)s=t.charCodeAt(u),2==u%8?s-=2:4==u%8||7==u%8?s+=2:0==u%8?s+=4:5==u%8||6==u%8?s-=4:1==u%8?s+=3:3==u%8&&(s+=5),o+=String.fromCharCode(s);
		
		return o;
	}

	static async decryptServer(url) {
		let key = (await Config.findOne({ key: 'fmovies_keys' })).value[1];

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
