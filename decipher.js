// function clone_script_node(node){
//     // console.log("\n\n\nnew script!")
//     var script  = document.createElement("script");
//     script.text = node.innerHTML;
//     // console.log("text: " + script.text)
//     var i = -1, attrs = node.attributes, attr;
//     while (++i < attrs.length) {
//         script.setAttribute((attr = attrs[i]).name, attr.value);
//         if (attr.name === "src")
//             console.log(attr.value)
//     }
//     return script;
// }


// function replace_all_script_nodes(node) {
//     if (node.tagName === 'SCRIPT') {
//         node.parentNode.replaceChild(clone_script_node(node), node);
//     } else {
//         var i = -1, children = node.childNodes;
//         while (++i < children.length) {
//             replace_all_script_nodes(children[i]);
//         }
//     }

//     return node;
// }

function insertHTML(html){
    // if no append is requested, clear the target element
    // if(!append) dest.innerHTML = '';
    // create a temporary container and insert provided HTML code
    let container = document.createElement('div');
    container.innerHTML = html;
    // cache a reference to all the scripts in the container
    let scripts = container.querySelectorAll('script');
    // get all child elements and clone them in the target element
    let nodes = container.childNodes;
    // for( let i=0; i< nodes.length; i++) dest.appendChild( nodes[i].cloneNode(true) );
    // force the found scripts to execute...
    for( let i=0; i< scripts.length; i++){
        let script = document.createElement('script');
        script.type = scripts[i].type || 'text/javascript';
        if( scripts[i].hasAttribute('src') ) script.src = scripts[i].src;
        script.innerHTML = scripts[i].innerHTML;
        document.head.appendChild(script);
        document.head.removeChild(script);
    }
    // done!
    return true;
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

    // insertHTML(document.body.innerHTML)
    // replace_all_script_nodes(document.getElementsByTagName("body")[0]);
}

window.onload = decrypt_page
