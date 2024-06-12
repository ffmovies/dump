var e = "ysJhV6U27FVIjjuk";
var u = "hlPeNwkncH0fq9so";
function W(t) {
    return btoa(t).replace(/\//g, "_").replace(/\+/g, "-");
}
function enc(t) {
	return function (t) {
		t = encodeURIComponent(t);
		for (var s = ((t = W(t)), ""), r = 0; r < t.length; r++) {
			var h = t.charCodeAt(r);
			if (r % 8 == 1) {
				h += 3;
			} else if (r % 8 == 7) {
				h += 5;
			} else if (r % 8 == 2) {
				h -= 4;
			} else if (r % 8 == 4) {
				h -= 2;
			} else if (r % 8 == 6) {
				h += 4;
			} else if (r % 8 == 0) {
				h -= 3;
			} else if (r % 8 == 3) {
				h += 2;
			} else if (r % 8 == 5) {
				h += 5;
			}
			s += String.fromCharCode(h);
		}
		return (s = (function (t) {
			return t.replace(/[a-zA-Z]/g, function (t) {
				return String.fromCharCode(
					(t <= "Z" ? 90 : 122) >= (t = t.charCodeAt(0) + 13) ? t : t - 26
				);
			});
		})((s = W(s))));
	}(W(_enc(e, t)));
}

function _enc(t, i) {
    for (var r, h = [], u = 0, o = "", e = 0; e < 256; e++) {
        h[e] = e;
    }
    for (e = 0; e < 256; e++) {
        u = (u + h[e] + t.charCodeAt(e % t.length)) % 256;
        r = h[e];
        h[e] = h[u];
        h[u] = r;
    }
    for (var e = 0, u = 0, c = 0; c < i.length; c++) {
        r = h[(e = (e + 1) % 256)];
        h[e] = h[(u = (u + h[e]) % 256)];
        h[u] = r;
        o += String.fromCharCode(i.charCodeAt(c) ^ h[(h[e] + h[u]) % 256]);
    }
    return o;
}
console.log(enc('177'));
console.log(enc('HzWYCg==,HTSfCMIu,FTqaCw=='));