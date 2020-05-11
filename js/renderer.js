// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
var world_x = 100;
var world_y = 4;
var world_z = 100;

var cam_move_x = 0;
var cam_move_y = 0;
var cam_move_z = 0;

// set up the editor
var editor = ace.edit("editor");
editor.setTheme("ace/theme/merbivore");
editor.session.setMode("ace/mode/javascript");
editor.session.setValue(
    "function compute(x, y, z) {\n    return 1.0 - (y / G.HEIGHT);\n}\n"
);

// set up 3d renderer
var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer();
$("#preview").append(renderer.domElement);

var geometry = new THREE.BoxGeometry();
var material = new THREE.MeshDepthMaterial({ wireframe: true });
var cube = new THREE.Mesh(geometry, material);
cube.position.z = -4;
scene.add(cube);

// set up the content divide, and resize handle
Split(['#preview', '#editor'], {
    onDrag: () => {
        renderer.setSize($("#preview").width(), $("#preview").height());
        var pos = camera != undefined ? camera.position : { x: 0, y: 0, z: 0 };
        camera = new THREE.PerspectiveCamera(75, $("#preview").width() / $("#preview").height(), 0.1, 1000);
        camera.position.x = pos.x;
        camera.position.y = pos.y;
        camera.position.z = pos.z;
    },
    onDragEnd: (sizes) => {
        // TODO: save size to reload on next startup
        // https://github.com/nathancahill/split/tree/master/packages/splitjs#saving-state
    }
});

// set window resize handle
window.addEventListener('resize', () => {
    renderer.setSize($("#preview").width(), $("#preview").height());
    var pos = camera != undefined ? camera.position : { x: 0, y: 0, z: 0 };
    camera = new THREE.PerspectiveCamera(75, $("#preview").width() / $("#preview").height(), 0.1, 1000);
    camera.position.x = pos.x;
    camera.position.y = pos.y;
    camera.position.z = pos.z;
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

    // move camera
    camera.position.x += 0.1 * cam_move_x;
    camera.position.y += 0.1 * cam_move_y;
    camera.position.z += 0.1 * cam_move_z;

    // render again
    renderer.render(scene, camera);

    stats.end();
    requestAnimationFrame(animate);
}

animate();

document.addEventListener('keydown', (event) => {
    switch (event.keyCode) {
        case 65: //a
            cam_move_x = -1.0;
            break;
        case 68: //d
            cam_move_x = 1.0;
            break;
        case 87: //w
            cam_move_z = -1.0;
            break;
        case 83: //s
            cam_move_z = 1.0;
            break;
        case 81: //q
            cam_move_y = -1.0;
            break;
        case 69: //e
            cam_move_y = 1.0;
            break;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.keyCode == 65 || event.keyCode == 68)
        cam_move_x = 0.0;
    if (event.keyCode == 87 || event.keyCode == 83)
        cam_move_z = 0.0;
    if (event.keyCode == 81 || event.keyCode == 69)
        cam_move_y = 0.0;
});

// create button for build
$("#btn-build").on("click", () => {
    test(editor.getValue());
});

function test(js_code) {
    try {
        const PtrSize = Module.ccall("GetPtrSize");
        console.log("PTR: " + PtrSize);

        var matrix = generate_matrix(js_code, world_x, world_y, world_z);
        var clr_matrix = new Float32Array(4 * world_x * world_y * world_z);
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
            [buf_matrix, buf_clr_matrix, buf_list_addr, buf_list_size, world_x, world_y]
        );

        var vert_addr = Module.HEAP32[buf_list_addr / Int32Array.BYTES_PER_ELEMENT] / Float32Array.BYTES_PER_ELEMENT;
        var norm_addr = Module.HEAP32[buf_list_addr / Int32Array.BYTES_PER_ELEMENT + 1] / Float32Array.BYTES_PER_ELEMENT;
        var clrs_addr = Module.HEAP32[buf_list_addr / Int32Array.BYTES_PER_ELEMENT + 2] / Float32Array.BYTES_PER_ELEMENT;
        
        var vert_count = Module.HEAP32[buf_list_size / Int32Array.BYTES_PER_ELEMENT];
        var norm_count = Module.HEAP32[buf_list_size / Int32Array.BYTES_PER_ELEMENT + 1];
        var clrs_count = Module.HEAP32[buf_list_size / Int32Array.BYTES_PER_ELEMENT + 2];
        
        var verts = Module.HEAPF32.slice(vert_addr, vert_addr + vert_count);
        // var normals = Module.HEAPF32.slice(norm_addr, norm_addr + norm_count);
        // var colors = Module.HEAPF32.slice(clrs_addr, clrs_addr + clrs_count);

        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        var material = new THREE.MeshDepthMaterial({ wireframe: true });
        mesh = new THREE.Mesh(geometry, material);
        
        // center mesh
        mesh.position.x = -(world_x / 2);
        mesh.position.y = -(world_y / 2);
        mesh.position.z = -(world_z / 2);

        scene.add(mesh);

        Module._free(buf_matrix);
        Module._free(buf_clr_matrix);
        Module._free(buf_list_addr);
        Module._free(buf_list_size);

        console.log("Done.");
    } catch (e) {
        console.log(e);
    } finally {
        Module._free(buffer)
    }
}

function generate_matrix(js_code, wx, wy, wz) {
    var matrix = new Float32Array(wx * wy * wz);

    var context = make_obj_injection("G", {
        WIDTH: world_x,
        HEIGHT: world_y
    });

    for (var x = 0; x < wx; x++)
        for (var y = 0; y < wy; y++)
            for (var z = 0; z < wz; z++)
                matrix[(y * wx * wz) + (z * wx) + x] = eval(compute_point(x, y, z, js_code, context));

    return matrix;
}

function compute_point(x, y, z, js_code, globals) {
    return eval(globals + "compute(" + x + ", " + y + ", " + z + ");" + js_code);
}

function make_obj_injection(name, context) {
    return make_var_injection(name, JSON.stringify(context));
}

function make_var_injection(name, context) {
    return "const " + name + " = " + context + "; ";
}
