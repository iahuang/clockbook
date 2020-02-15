var esc = encodeURIComponent;

function query(url, params) {
    return url+'?'+Object.keys(params)
        .map(k => esc(k) + "=" + esc(params[k]))
        .join("&");
}
