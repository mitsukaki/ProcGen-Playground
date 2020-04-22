// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
var world_x = 10;
var world_y = 10;
var world_z = 10;

var editor = ace.edit("editor");
editor.setTheme("ace/theme/merbivore");
editor.session.setMode("ace/mode/javascript");
editor.session.setValue(
    "function compute(x, y, z) {\n    return x + y + z;\n}\n"
);

Split(['#preview', '#editor']);

$("#btn-build").on("click", () => {
    test(editor.getValue());
});

var matrix;

function test(js_code) {
    try {
        matrix = generate_matrix();

    } catch (e) {
        console.log(e);
    }
}

function generate_matrix(js_code) {
    var matrix = new Array();

    for (var x = 0; x < world_x; x++) {
        matrix[x] = new Array();
        for (var y = 0; y < world_y; y++) {
            matrix[x][y] = new Array();
            for (var z = 0; z < world_z; z++)
                matrix[x][y][z] = eval(compute_point(x, y, z, js_code));
        }
    }

    return matrix;
}

function compute_point(x, y, z, js_code) {
    return eval(js_code + "compute(" + x + ", " + y + ", " + z + ");");
}