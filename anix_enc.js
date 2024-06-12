var cp = 'iECwVsmW38Qe94KN'
var dcp = 'hlPeNwkncH0fq9so'
function enc(t, i) {
	for (var s, u = [], o = 0, h = '', c = 0; c < 256; c++) {
	  u[c] = c
	}
	for (c = 0; c < 256; c++) {
	  o = (o + u[c] + t.charCodeAt(c % t.length)) % 256
	  s = u[c]
	  u[c] = u[o]
	  u[o] = s
	}
	for (var c = 0, o = 0, e = 0; e < i.length; e++) {
	  s = u[(c = (c + 1) % 256)]
	  u[c] = u[(o = (o + u[c]) % 256)]
	  u[o] = s
	  h += String.fromCharCode(i.charCodeAt(e) ^ u[(u[c] + u[o]) % 256])
	}
	return h
  }
  function _enc(t) {
	t = ''.concat(t)
	s = 0
	for (; s < t.length; s++) {
	  if (t.charCodeAt(s) > 255) {
		return null
	  }
	}
	for (var r = '', s = 0; s < t.length; s += 3) {
	  var u = [undefined, undefined, undefined, undefined]
	  u[0] = t.charCodeAt(s) >> 2
	  u[1] = (3 & t.charCodeAt(s)) << 4
	  if (t.length > s + 1) {
		u[1] |= t.charCodeAt(s + 1) >> 4
		u[2] = (15 & t.charCodeAt(s + 1)) << 2
	  }
	  if (t.length > s + 2) {
		u[2] |= t.charCodeAt(s + 2) >> 6
		u[3] = 63 & t.charCodeAt(s + 2)
	  }
	  for (var o = 0; o < u.length; o++) {
		r += 'undefined' == typeof u[o] ? '=' : (function (t) {
			if (t >= 0 && t < 64) {
				return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[t]
			}
		})(u[o])
	  }
	}
	return r
  }
function __enc (t) {
	return _enc(function (t) {
		for (var r = 10, s = '', u = 0; u < t.length; u++) {
			var o = t["charCodeAt"](u);
			if (0) {
				o = 0;
			} else if (u % r == 7) {
				o -= 6;
			} else if (u % r == 5) {
				o -= 4;
			} else if (u % r == 8) {
				o -= 2;
			} else if (u % r == 0) {
				o -= 4;
			} else if (u % r == 3 || u % r == 2 || u % r == 6) {
				o += 3;
			} else if (u % r == 9 || u % r == 1) {
				o -= 4;
			} else if (u % r == 4) {
				o += 6;
			}
			s += String.fromCharCode(o);
		}
		return s = s.split('').reverse().join('');
	}(t));
}

function __encNew (t) {
	return _enc(function (t) {
		for (var r = 6, s= (t = t.split('').reverse().join(''), ''), u = 0; u < t.length; u++) {
			var o = t.charCodeAt(u);
			if (0) {
				o = 0;
			} else if (u % r == 0 || (u % r) == 5) {
				o -= 6;
			} else if (u % r == 2) {
				o += 3;
			} else if (u % r == 3) {
				o -= 5;
			} else if (u % r == 4) {
				o += 2;
			} else if (u % r == 1) {
				o += 3;
			}
			s += String.fromCharCode(o);
		}
		return s;
	}(t));
}

function dec (t) {
	let a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	if ((t = (t = (t = ''.concat(t)).replace(/[\t\n\f\r]/g, '')).length % 4 == 0 ? t.replace(/==?$/, '') : t).length % 4 == 1 || /[^+/0-9A-Za-z]/.test(t)) {
		return null;
	}
	for (var r, s = '', u = 0, o = 0, h = 0; h < t.length; h++) {
		u = (u <<= 6) | (r = t[h], (r = a.indexOf(r)) < 0 ? undefined : r);
		if ((o += 6) === 24) {
			s = (s = (s += String.fromCharCode((16711680 & u) >> 16)) + String.fromCharCode((65280 & u) >> 8)) + String.fromCharCode(255 & u);
			u = o = 0;
		}
	}
	if (o === 12) {
		u >>= 4;
		s += String.fromCharCode(u);
	} else if (o === 18) {
		u >>= 2;
		s = (s += String.fromCharCode((65280 & u) >> 8)) + String.fromCharCode(255 & u);
	}
	return s;
}
function _dec (t, i) {
	for (var s, u = [], o = 0, h = '', c = 0; c < 256; c++) {
		u[c] = c;
	}
	for (c = 0; c < 256; c++) {
		o = (o + u[c] + t.charCodeAt(c % t.length)) % 256;
		s = u[c];
		u[c] = u[o];
		u[o] = s;
	}
	for (var c = 0, o = 0, e = 0; e < i.length; e++) {
		s = u[c = (c + 1) % 256];
		u[c] = u[o = (o + u[c]) % 256];
		u[o] = s;
		h += String.fromCharCode(i.charCodeAt(e) ^ u[(u[c] + u[o]) % 256]);
	}
	return h;
}

function encode (t) {
	t = encodeURIComponent(t);
	return __enc(_enc(enc(cp, t)));
}
function decode(t) {
	t = _dec(dcp, dec(t));
	return decodeURIComponent(t);
}

// console.log(encode('16270'))
console.log(__enc(_enc(enc('rzyKmquwICPaYFkU', '67775'))))
// console.log(encode('HziWCMgvkg'))
console.log(encode('HziWCMgvkg'))
console.log(decode('ab6/pL62s6RbkiH8gxfPL6dZQl5qkGB2K9nw0+h55c+uM2YWKbJ4jjXoHUfbjl5/gw8Gr0xz+AE='))
console.log(__encNew(_enc(enc('FtFyeHeWL36bANDy', '83P7KO5KVYLE'))))