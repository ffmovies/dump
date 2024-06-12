import axios from 'axios';
import { Solver } from '@2captcha/captcha-solver';
import Helper from './helpers/helper.js';

const API_KEY = '' // 2captcha api key
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
const IPS = [ // main server ips
	'195.230.23.7', '195.230.23.67', '195.230.23.79', '195.230.23.77',
	'195.230.23.83', '195.230.23.63', '195.230.23.97', '91.206.228.57'
]
const HOSTS = ['fmoviesz.to', 'anix.to', 'aniwave.to']

export default class WAF {

	static async getCookies(ip = null, host = 'anix.to') {
		ip = ip || IPS[Math.floor(Math.random() * IPS.length)]
		host = host || HOSTS[Math.floor(Math.random() * HOSTS.length)]
		console.log(`ip: ${ip}, host: ${host}`)
		let resp, cookie = '', cookies = []
		resp = await axios(`http://${ip}`, { 
			headers: { host, 'User-Agent': UA }
		}).then(resp => resp.data).catch(console.error)
		if (resp.includes('g-recaptcha')) {
			let captchaKey = resp.match(/data-sitekey="(.+?)"/)[1]
			console.log(`Found recaptcha: ${captchaKey}`)
			let captchaResp = await new Solver(API_KEY).recaptcha({
				pageurl: `http://${ip}`, googlekey: captchaKey,
				userAgent: UA, version: 'v2'
			}).then(resp => resp.data).catch(console.error)
			cookie = await axios(`http://${ip}/waf-captcha-verify`, {
				maxRedirects: 0, validateStatus: (status) => status >= 200,
				method: 'POST', data: `g-recaptcha-response=${captchaResp}`,
				headers: {
					host, origin: `http://${ip}`, 'User-Agent': UA, 
					'Content-Type': 'application/x-www-form-urlencoded',
				}
			}).then(resp => {
				return resp.headers['set-cookie'].map(cookie => cookie.split(';')[0])[0]
			}).catch(console.error), cookies.push(cookie)
			resp = await axios(`http://${ip}`, {
				headers: { host, 'User-Agent': UA, cookie }
			}).then(resp => resp.data).catch(console.error)
		}
		if (resp.includes('waf-js-run')) {
			let [_, _a, _b] = /_a = '(\w+)'\W+_b = '(\w+)'/gm.exec(resp)
			let waf = await axios(`http://${ip}/waf-js-run`, { 
				headers: { host, 'User-Agent': UA } 
			}).then(resp => resp.data).catch(console.error)
			let z = (await Helper.evalDecode(waf)).match(/'(\w{32})'/)[1], o = ''
			for (let i = 0; i < z.length; i++) o += z[i] + _a[i] + _b[i];
			cookie = await axios(`http://${ip}/?__jscheck=${o}`, {
				headers: { host, 'User-Agent': UA },
				maxRedirects: 0, validateStatus: (status) => status >= 200
			}).then(resp => {
				return resp.headers['set-cookie'].map(cookie => cookie.split(';')[0])[0]
			}).catch(console.error), cookies.push(cookie)
			resp = await axios(`http://${ip}`, {
				headers: { host, 'User-Agent': UA, cookie: cookies.join('; ') }
			}).then(resp => resp.data).catch(console.error)
		}
		if (!resp.includes('og:title')) 
			return { error: 'Waf bypass failed' }
		return { cookies }
	}
}