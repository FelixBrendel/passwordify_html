function load_script(o_script, callback) {

    let script = document.createElement('script');
    script.type = o_script.type || 'text/javascript';

    if(o_script.hasAttribute('src')) {
        script.src = o_script.src;
        script.onload = callback
    }

    script.innerHTML = o_script.innerHTML;
    document.head.appendChild(script);

    if(o_script.src === "") {
        // NOTE(Felix): it seems the onload is not called on script nodes that
        //   define the js inline instead of through a src attribute, so for
        //   them we call the callback manually and hope for the best.
        callback();
    }
}

var next_script_index = 0
var deferred_scripts = []

function load_next_deferred_script() {
    console.log("recurse!")
    if (next_script_index >= deferred_scripts.length)
        return

    load_script(deferred_scripts[next_script_index++], () => load_next_deferred_script())
}

function decrypt_page() {
    var key_str = ""
    var html_name = window.location.pathname;
    var allcookies = document.cookie;
    cookiearray = allcookies.split(';');
    for(var i=0; i<cookiearray.length; i++) {
        name = cookiearray[i].split('=')[0].trim();
        value = cookiearray[i].split('=')[1];
        if (name == html_name)
            key_str = value;
        if (name == "__master__") {
            key_str = value;
            break;
        }
    }

    if (key_str.length == 0)
        key_str = document.querySelector('input[name=pwd]').value

    // check key length
    if (key_str.length != 16 &&
        key_str.length != 24 &&
        key_str.length != 32)
    {
        return;
    }
    var entered_key = aesjs.utils.utf8.toBytes(key_str);
    var enc_bytes = aesjs.utils.hex.toBytes(enc_hex_body)

    // check if the user input / loaded cookie is the master key
    var aesCtr = new aesjs.ModeOfOperation.ctr(entered_key, new aesjs.Counter(initial_counter))
    var master_key_dec_real_key = aesCtr.decrypt(aesjs.utils.hex.toBytes(master_key_enc_real_key))

    aesCtr = new aesjs.ModeOfOperation.ctr(master_key_dec_real_key, new aesjs.Counter(initial_counter))
    var dec_bytes = aesCtr.decrypt(enc_bytes)

    // Convert our bytes back into text
    var dec_text = aesjs.utils.utf8.fromBytes(dec_bytes)
    if (!dec_text.endsWith(correct_key_marker)) {
        // check if it is a regular password
        aesCtr = new aesjs.ModeOfOperation.ctr(entered_key, new aesjs.Counter(initial_counter))
        var org_key_dec_real_key = aesCtr.decrypt(aesjs.utils.hex.toBytes(org_key_enc_real_key))

        aesCtr = new aesjs.ModeOfOperation.ctr(org_key_dec_real_key, new aesjs.Counter(initial_counter))
        dec_bytes = aesCtr.decrypt(enc_bytes)
        dec_text  = aesjs.utils.utf8.fromBytes(dec_bytes)

        if (!dec_text.endsWith(correct_key_marker)) {
            key_str = "";
            return
        } else {
            // entered correct file key
            document.cookie = html_name + "=" + key_str;
        }
    } else {
        // entered correct master key
        document.cookie = "__master__=" + key_str;
    }

    // Convert our bytes back into text
    // var dec_text = aesjs.utils.utf8.fromBytes(dec_bytes)
    var dec_text = new TextDecoder().decode(dec_bytes)
    document.body.outerHTML = "<body" + dec_text + "</body>"


    deferred_scripts = document.body.querySelectorAll('script');
    load_next_deferred_script()

}

window.onload = decrypt_page
