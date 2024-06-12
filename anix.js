var zz = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var encKey = "FWsfu0KQd9vxYGNB";
var decKey = "8z5Ag5wgagfsOuhz";
var id = "385687";
var str =
    "VfxvGYo3N8o-U0vTPLDxAq2MC_qT8e0tYiXzI3cEnjAa1mkWQ-ygJMrzJ0ZakCXlmToksca4F0zjHXH-C-9OyIob7c7KdIlUdOap9FwOHduD_xufKwQyjJ7ykkbJOVg9Qt5OUEqFWL7omz5MryLFzX882KoCqlC1Y4t_15iUId-21Uga5q3KfCtEtrJQ50jwZUdtbajf6lBALJd65vVUcmeqkXNgjv6Uy_wdfbCEd9oc2-icttF6nhjGqQLD7n4ukcmqUpnngRv4fos=";
// var str = 'VfxvGYo3N8o-U0vTPLDxAq2MC_qT8e0tYiXzI3cEnjAa1mkWQ-ygJMrzJ0ZakCXlmToksca4F0zjHXH-C-9OyIob7c7KdIlUdOap9FwOHduD_xufKwQyjJ7ykkbJOVg9Qt5OUEqFWL7omz5MryLFzX882KoCqlC1Y4t_15iUId-21Uga5q3KfCtEtrJQ50jwZUdtbajf6lBALJd65vVUcmeqkmNgjf6Ey_wdfbCEd9oc2-icttF6nhjGqQLD7n4ukcmqUpnngRv4fos=';
function f(t) {
    return btoa(t).replace(/\//g, "_").replace(/\+/g, "-");
}
function enc(t) {
    t = encodeURIComponent(t);
    return (function (t) {
        for (
            var s = 5,
                o =
                    ((t = f(
                        (t = (function (t) {
                            return t.replace(/[a-zA-Z]/g, function (t) {
                                return String.fromCharCode(
                                    (t <= "Z" ? 90 : 122) >=
                                        (t = t.charCodeAt(0) + 13)
                                        ? t
                                        : t - 26
                                );
                            });
                        })(t))
                    )),
                    ""),
                u = 0;
            u < t.length;
            u++
        ) {
            var c = t.charCodeAt(u);
            if (0) {
                c = 0;
            } else if (u % s == 1 || u % s == 4) {
                c -= 2;
            } else if (u % s == 3) {
                c += 5;
            } else if (u % s == 0) {
                c -= 4;
            } else if (u % s == 2) {
                c -= 6;
            }
            o += String.fromCharCode(c);
        }
        return o;
    })(f(_enc(encKey, t)));
}

function _enc(t, n) {
    for (var r, s = [], o = 0, u = "", c = 0; c < 256; c++) {
        s[c] = c;
    }
    for (c = 0; c < 256; c++) {
        o = (o + s[c] + t.charCodeAt(c % t.length)) % 256;
        r = s[c];
        s[c] = s[o];
        s[o] = r;
    }
    for (var c = 0, o = 0, h = 0; h < n.length; h++) {
        r = s[(c = (c + 1) % 256)];
        s[c] = s[(o = (o + s[c]) % 256)];
        s[o] = r;
        u += String.fromCharCode(n.charCodeAt(h) ^ s[(s[c] + s[o]) % 256]);
    }
    return u;
}

function _dec(n) {
    if (
        (n =
            (n = (n = "".concat(n)).replace(/[\t\n\f\r]/g, "")).length % 4 == 0
                ? n.replace(/==?$/, "")
                : n).length %
            4 ==
            1 ||
        /[^+/0-9A-Za-z]/.test(n)
    ) {
        return null;
    }
    for (var r, i = "", e = 0, u = 0, c = 0; c < n.length; c++) {
        e = (e <<= 6) | ((r = n[c]), (r = zz.indexOf(r)) < 0 ? undefined : r);
        if ((u += 6) === 24) {
            i =
                (i =
                    (i += String.fromCharCode((e & 16711680) >> 16)) +
                    String.fromCharCode((e & 65280) >> 8)) +
                String.fromCharCode(e & 255);
            e = u = 0;
        }
    }
    if (u === 12) {
        e >>= 4;
        i += String.fromCharCode(e);
    } else if (u === 18) {
        e >>= 2;
        i =
            (i += String.fromCharCode((e & 65280) >> 8)) +
            String.fromCharCode(e & 255);
    }
    return i;
}

function dec(n, t) {
    t = _dec(t.replaceAll("_", "/").replaceAll("-", "+"));
    for (var i, e = [], u = 0, c = "", o = 0; o < 256; o++) {
        e[o] = o;
    }
    for (o = 0; o < 256; o++) {
        u = (u + e[o] + n.charCodeAt(o % n.length)) % 256;
        i = e[o];
        e[o] = e[u];
        e[u] = i;
    }
    for (var o = 0, u = 0, f = 0; f < t.length; f++) {
        i = e[(o = (o + 1) % 256)];
        e[o] = e[(u = (u + e[o]) % 256)];
        e[u] = i;
        c += String.fromCharCode(t.charCodeAt(f) ^ e[(e[o] + e[u]) % 256]);
    }
    return decodeURIComponent(c);
}
function fenc(n, t) {
    for (var a, r = [], s = 0, k = "", m = 0; m < 256; m++) {
        r[m] = m;
    }
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
    for (; a < n.length; a++) {
        if (n.charCodeAt(a) > 255) {
            return null;
        }
    }
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
        for (var i = 0; i < u.length; i++) {
            s +=
                "undefined" == typeof u[i]
                    ? "="
                    : (function (k) {
                          if (k >= 0 && k < 64) {
                              return zz[k];
                          }
                      })(u[i]);
        }
    }
    return s;
}
var k = "VXBSragb4Z7Mr4w_W7toPDHALv0fkw9GabE=", a = [k];
var v = fenc("msNaYWfKE53Nn2ak", "51J0DVM63PQ8");
v = fenc("BDIQMaG92sDXChYx", v);
v = _fenc(v).replace(/\//g, "_");
for (var i = 0; i < v.length; i++)
    a.push(k.charCodeAt(i % k.length) + v.charCodeAt(i));

console.log(enc(id));
console.log(dec(decKey, str));
console.log(v, a.join(","));
