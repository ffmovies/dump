import Extractor from "./helpers/extractor.js";
import Helper from "./helpers/helper.js";

(async () => {
	let source = process.argv[2], browser
	if (source === 'mycloud') {
		let keys = await Extractor.extract('mycloud', { traverse: 1 })
		if (keys?.key1 && keys?.key2) {
			console.log(`${keys.key1}.^.${keys.key2}`)
			Helper.writeKeys('vidplay', [keys.key1, keys.key2])
		} else console.log(keys.error ?? 'keys not found');
	} else if (source === 'vidplay') {
		let keys = await Extractor.extract('vidplay')
		if (!keys?.key1 || !keys.key2) 
			keys = await Extractor.extract('mycloud')
		if (keys?.key1 && keys?.key2) {
			console.log(`${keys.key1}.^.${keys.key2}`)
			Helper.writeKeys('vidplay', [keys.key1, keys.key2])
		} else console.log(keys.error ?? 'keys not found');
	} else if (['megacloud_m'].includes(source)) {
		let hosts = { megacloud_m: 'megacloud.tv' }
		let image = `https://${hosts[source]}/images/lucky_animal/icon.png`
		let keys = await Extractor.getKeysFromImage(image)
		if (keys?.length > 0)  {
			console.log(keys)
			Helper.writeKeys('megacloud_m', keys)
		} else console.log(keys.error ?? 'keys not found')
	} else if (['megacloud_a', 'rapid', 'rapid_e6'].includes(source)) {
		let keys = await Extractor.extract(source, { extract: true })
		if (keys.key1)  {
			console.log(keys.key1)
			Helper.writeKeys(source, keys.key1)
		} else console.log(keys.error ?? 'keys not found')
	} else if (['vidsrc', 'fmovies', 'anix'].includes(source)) {
		let keys = await Extractor.extract(source)
		if (keys?.key1 && keys?.key2) {
			console.log(`${keys.key1}.^.${keys.key2}`)
			Helper.writeKeys(source, [keys.key1, keys.key2])
		} else console.log(keys.error ?? 'keys not found');
	} else if (source === 'aniwave') {
		let keys = await Extractor.extract('aniwave')
		if (keys?.key1) {
			console.log(keys.key1)
			Helper.writeKeys('aniwave', [keys.key1])
		} else console.log(keys.error ?? 'keys not found');
	} else if (source.includes('bunny')) {
		let keys = await Extractor.extract(source)
		if (keys?.key1 && keys?.key2) {
			console.log(`${keys.key1}.^.${keys.key2}`)
			Helper.writeKeys(source, [keys.key1, keys.key2])
		} else console.log(keys.error ?? 'keys not found');
	}
	
	console.log('done');
	return process.exit(0);
})()