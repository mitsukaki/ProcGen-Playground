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

// set up performance monitor
var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
stats.domElement.className = "stats";
document.body.appendChild(stats.domElement);

// launch render loop
function animate() {
    stats.begin();

    // update
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    // render again
    renderer.render(scene, camera);

    stats.end();
    requestAnimationFrame(animate);
}

animate();

// create button for build
$("#btn-build").on("click", () => {
    test(editor.getValue());
});

function test(js_code) {
    try {
        const PtrSize = Module.ccall("GetPtrSize");
        console.log("PTR: " + PtrSize);

        var matrix = generate_matrix(js_code, 10, 10, 10);
        var clr_matrix = new Float32Array(4 * 10 * 10 * 10);
        var list_addr = new Int32Array(3);
        var list_size = new Int32Array(3);

        var buf_matrix = Module._malloc(matrix.length * matrix.BYTES_PER_ELEMENT)
        var buf_clr_matrix = Module._malloc(clr_matrix.length * clr_matrix.BYTES_PER_ELEMENT)
        var buf_list_addr = Module._malloc(list_addr.length * list_addr.BYTES_PER_ELEMENT)
        var buf_list_size = Module._malloc(list_size.length * list_size.BYTES_PER_ELEMENT)
        
        Module.HEAPF32.set(matrix, buf_matrix >> 2)
        Module.HEAPF32.set(clr_matrix, buf_clr_matrix >> 2)
        Module.HEAP32.set(list_addr, buf_list_addr >> 2)
        Module.HEAP32.set(list_size, buf_list_size >> 2)

        Module.ccall(
            "GenerateMesh", null,
            ["number", "number", "number", "number", "number", "number"],
            [buf_matrix, buf_clr_matrix, buf_list_addr, buf_list_size, 10, 10]
        );

        var vert_addr = Module.HEAP32[buf_list_addr / Int32Array.BYTES_PER_ELEMENT] / Float32Array.BYTES_PER_ELEMENT;
        var norm_addr = Module.HEAP32[buf_list_addr / Int32Array.BYTES_PER_ELEMENT + 1] / Float32Array.BYTES_PER_ELEMENT;
        var clrs_addr = Module.HEAP32[buf_list_addr / Int32Array.BYTES_PER_ELEMENT + 2] / Float32Array.BYTES_PER_ELEMENT;
        
        var vert_count = Module.HEAP32[buf_list_size / Int32Array.BYTES_PER_ELEMENT];
        var norm_count = Module.HEAP32[buf_list_size / Int32Array.BYTES_PER_ELEMENT + 1];
        var clrs_count = Module.HEAP32[buf_list_size / Int32Array.BYTES_PER_ELEMENT + 2];
        
        var vertices = Module.HEAPF32.slice(vert_addr, vert_addr + vert_count);
        // var normals = Module.HEAPF32.slice(norm_addr, norm_addr + norm_count);
        // var colors = Module.HEAPF32.slice(clrs_addr, clrs_addr + clrs_count);

        /*
        Module._free(buf_matrix);
        Module._free(buf_clr_matrix);
        Module._free(buf_list_addr);
        Module._free(buf_list_size);
        */

        console.log("Done.");
    } catch (e) {
        console.log(e);
    } finally {
        Module._free(buffer)
    }
}

function generate_matrix(js_code, wx, wy, wz) {
    var matrix = new Float32Array(wx * wy * wz);

    for (var x = 0; x < wx; x++)
        for (var y = 0; y < wy; y++)
            for (var z = 0; z < wz; z++)
                matrix[(y * wx * wz) + (z * wx) + x] = eval(compute_point(x, y, z, js_code));

    return matrix;
}

function compute_point(x, y, z, js_code) {
    return eval("compute(" + x + ", " + y + ", " + z + ");" + js_code);
}