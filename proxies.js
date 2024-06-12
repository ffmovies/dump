let ips = [ // ovh proxy ips
	"57.128.33.119", "141.95.124.153", "57.128.33.117", "135.125.163.115", "57.128.33.101",
	"51.178.133.113", "54.38.38.101", "51.178.133.85", "57.128.33.118", "78.142.29.29", "57.128.33.116",
	"141.95.124.152", "51.178.68.87", "141.95.124.151", "141.95.124.168", "51.91.218.211", "57.128.33.121",
	"141.95.124.225", "51.178.178.9", "51.178.133.12", "57.128.33.120", "141.95.124.160", "57.128.33.62",
	"141.95.124.169", "57.128.33.106", "51.178.133.110", "51.178.133.115", "78.142.29.10"
];
let valid = [], chunk, chunkSize = 15, failed = [];
for (let i = 0; i < ips.length; i += chunkSize) {
	chunk = ips.slice(i, i + chunkSize);
	await Promise.all(chunk.map(async ip => {
		let path = '_v2/12a3c523f3105800ed8c394685aeeb0b972efa5c15bbfeed0a0c7baea93ece832257df1a4b6125fcfa38c35da05dee86aad28d46d73fc4e9d4e5a5385371f6d136c251f40b16ef0a11c1f6e93b552e433d64d57347532496ca96e65991f734de7c14a74e0467e152eae72a5aee0114/h/eaebdedf3/faaadda0011.png'
		let res = await axios.get(`http://${ip}/${path}`, {
			headers: { host: 'kdkg.v4507fb3559.site' } // mcloud.bz
		}).catch(e => e.response);
		if (!res) return failed.push(ip);
		if (res.status != 200) {
			failed.push(ip);
			return console.log('failed', ip);
		}
		valid.push(ip); 
	}));
}
console.log({ failed, valid });