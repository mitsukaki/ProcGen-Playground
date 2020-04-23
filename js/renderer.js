// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
var world_x = 10;
var world_y = 10;
var world_z = 10;

// set up the editor
var editor = ace.edit("editor");
editor.setTheme("ace/theme/merbivore");
editor.session.setMode("ace/mode/javascript");
editor.session.setValue(
    "function compute(x, y, z) {\n    return x + y + z;\n}\n"
);

// set up 3d renderer
var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer();
$("#preview").append(renderer.domElement);

var geometry = new THREE.BoxGeometry();
var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
var cube = new THREE.Mesh(geometry, material);
cube.position.z = -5;
scene.add(cube);

// set up the content divide, and resize handle
Split(['#preview', '#editor'], {
    onDrag: () => {
        renderer.setSize($("#preview").width(), $("#preview").height());
        camera = new THREE.PerspectiveCamera(75, $("#preview").width() / $("#preview").height(), 0.1, 1000);
    },
    onDragEnd: (sizes) => {
        // TODO: save size to reload on next startup
        // https://github.com/nathancahill/split/tree/master/packages/splitjs#saving-state
    }
});

// set window resize handle
window.addEventListener('resize', () => {
    renderer.setSize($("#preview").width(), $("#preview").height());
    camera = new THREE.PerspectiveCamera(75, $("#preview").width() / $("#preview").height(), 0.1, 1000);
});

// set intial renderer size
renderer.setSize($("#preview").width(), $("#preview").height());
camera = new THREE.PerspectiveCamera(75, $("#preview").width() / $("#preview").height(), 0.1, 1000);

// launch render loop
function animate() {
    requestAnimationFrame(animate);

    // update
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    // render again
    renderer.render(scene, camera);
}

animate();

// create button for build
$("#btn-build").on("click", () => {
    test(editor.getValue());
});

function test(js_code) {
    try {
       var matrix = generate_matrix(js_code);

        console.log("Done.");
    } catch (e) {
        console.log(e);
    }
}

function generate_matrix(js_code, wx, wy, wz) {
    var matrix = new Array();

    for (var x = 0; x < wx; x++)
        for (var y = 0; y < wy; y++)
            for (var z = 0; z < wz; z++)
                matrix[(x * wy * wz) + (y * wz) + z] = eval(compute_point(x, y, z, js_code));

    return matrix;
}

function compute_point(x, y, z, js_code) {
    return eval("compute(" + x + ", " + y + ", " + z + ");" + js_code);
}