import Helper from "./helpers/helper.js";
import { AnimeEpisode, AnimeMedia, Config } from "./helpers/models.js";
import { load } from "cheerio";

// // http://195.230.23.77/waf-js-run
// // 195.230.23.7, 195.230.23.67, 195.230.23.79, 195.230.23.83, 195.230.23.63, 195.230.23.97, 91.206.228.57
// let waf = readFileSync('./storage/anime/waf.js', 'utf-8');

// let z = Helper.evalDecode(waf).match(/'(\w{32})'/)[1];
// let _a = 'bc9724f4c5314d1b1ce80538e9925f05', _b = '12d58f481841e83af77294070591e31a', i, o = '';
// for (i = 0; i < z.length; i++) o += z[i] + _a[i] + _b[i];
// return console.log(`?__jscheck=${o}`)

(async () => {
	const host = () => ['anix.to', 'lite.aniwave.to'][Math.floor(Math.random() * 2)];
	for (let page = 29; page <= 405; page++) {
		console.log('\x1b[36m%s\x1b[0m', `#Scraping Page ${page}`)
		let resp = await Helper.fetch(`http://195.230.23.7/updated?page=${page}`, { 
			responseType: 'text', headers: { host: host() } 
			// add waf headers
		});
		let $ = load(resp.body), links = $('.s-content .poster').toArray(), chunks = 10;
		for (let i = 0; i < links.length; i += chunks) {
			let chunk = links.slice(i, i + chunks);
			await Promise.all(chunk.map(async x => {
				console.log(x.attribs['href']);
				let id = x.attribs['data-tip']?.split('?')?.[0];
				let slug = x.attribs['href'].split('-').pop();
				let anime = await AnimeMedia.findOne({ 'anix.id': slug }); 
				if (!anime) return;
				await anime.updateOne({ anix: { ...anime.anix, id } });
				let url = `https://${host()}/ajax/episode/list/${id}?vrf=${vrf(id)}`;
				await Helper.fetch(url, { responseType: 'json' }).then(resp => {
					$ = load(resp.body.result);
					$('[data-ids]').toArray().forEach(async x => {
						let epId = x.attribs['data-num'];
						await AnimeEpisode.findOneAndUpdate({ id: `${anime.mal_id}:${epId}` }, {
							id: `${anime.mal_id}:${epId}`, title: `Episode ${epId}`,
							anix: { sourceId: x.attribs['data-ids'] }
						}, { upsert: true, new: true });
					});
				});
			}));
			await new Promise(r => setTimeout(r, 250));
			if (i % 10 == 0) await new Promise(r => setTimeout(r, 750));
		}
	}

})();