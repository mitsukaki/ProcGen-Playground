function test(js_code) {
    try {
        eval(get_preface(0, 0, 0) + code);
    } catch (e) {
        console.log(e);
    }
}

function get_preface(x, y, z) {
    return "px = " + x + "; py = " + y + "; pz = " + z + ";";
}