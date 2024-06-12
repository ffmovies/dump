import { readFileSync, writeFileSync } from "fs";

export default class Helper {

	static writeKeys(key, value) {
		let keys = JSON.parse(readFileSync('./data/keys.json'));
		keys[key] = value;
		writeFileSync('./data/keys.json', JSON.stringify(keys));
		return value;
	}

	static async evalDecode(source) {
		let _eval = globalThis.eval;
		globalThis.eval = (code) => (globalThis.eval = _eval, code);	  
		return await _eval(source);
	}
}