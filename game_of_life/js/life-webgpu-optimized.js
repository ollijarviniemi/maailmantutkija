/**
 * Optimized WebGPU Game of Life Implementation
 *
 * Optimizations:
 * 1. Single command encoder for all steps (no per-batch submission)
 * 2. Larger workgroups (16x16 = 256 threads)
 * 3. Uses textures for better cache behavior
 */

export class LifeWebGPUOptimized {
    constructor() {
        this.device = null;
        this.width = 0;
        this.height = 0;
        this.timestep = 0;

        // GPU resources
        this.textures = null;  // Double buffer [0] and [1]
        this.computePipeline = null;
        this.bindGroups = null;

        this.currentBuffer = 0;

        // For reading back state
        this.stagingBuffer = null;
    }

    async init(width, height) {
        if (!navigator.gpu) {
            throw new Error('WebGPU not supported');
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error('Failed to get GPU adapter');
        }

        this.device = await adapter.requestDevice();
        this.width = width;
        this.height = height;
        this.timestep = 0;

        await this.createResources();
    }

    async createResources() {
        const device = this.device;
        const width = this.width;
        const height = this.height;

        // Use R32Uint textures - r8uint doesn't support storage binding
        // This wastes memory but is the simplest fix
        const textureDesc = {
            size: { width, height },
            format: 'r32uint',
            usage: GPUTextureUsage.STORAGE_BINDING |
                   GPUTextureUsage.TEXTURE_BINDING |
                   GPUTextureUsage.COPY_SRC |
                   GPUTextureUsage.COPY_DST,
        };

        this.textures = [
            device.createTexture(textureDesc),
            device.createTexture(textureDesc),
        ];

        // Staging buffer for readback (4 bytes per cell for r32uint)
        this.stagingBuffer = device.createBuffer({
            size: width * height * 4,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });

        // Compute shader with texture sampling
        const computeShader = device.createShaderModule({
            code: `
                @group(0) @binding(0) var cellsIn: texture_2d<u32>;
                @group(0) @binding(1) var cellsOut: texture_storage_2d<r32uint, write>;

                fn getCell(pos: vec2<i32>, size: vec2<i32>) -> u32 {
                    // Wrap around (toroidal)
                    let wrapped = (pos % size + size) % size;
                    return textureLoad(cellsIn, wrapped, 0).r;
                }

                @compute @workgroup_size(16, 16)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let size = vec2<i32>(textureDimensions(cellsIn));
                    let pos = vec2<i32>(id.xy);

                    if (pos.x >= size.x || pos.y >= size.y) {
                        return;
                    }

                    // Count neighbors - unrolled for performance
                    var neighbors: u32 = 0u;
                    neighbors += getCell(pos + vec2(-1, -1), size);
                    neighbors += getCell(pos + vec2( 0, -1), size);
                    neighbors += getCell(pos + vec2( 1, -1), size);
                    neighbors += getCell(pos + vec2(-1,  0), size);
                    neighbors += getCell(pos + vec2( 1,  0), size);
                    neighbors += getCell(pos + vec2(-1,  1), size);
                    neighbors += getCell(pos + vec2( 0,  1), size);
                    neighbors += getCell(pos + vec2( 1,  1), size);

                    let alive = getCell(pos, size);

                    // Conway's rules
                    var next: u32 = 0u;
                    if (alive == 1u && (neighbors == 2u || neighbors == 3u)) {
                        next = 1u;
                    } else if (alive == 0u && neighbors == 3u) {
                        next = 1u;
                    }

                    textureStore(cellsOut, pos, vec4<u32>(next, 0u, 0u, 0u));
                }
            `,
        });

        // Bind group layout
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: { sampleType: 'uint' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: { access: 'write-only', format: 'r8uint' }
                },
            ],
        });

        this.computePipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            compute: { module: computeShader, entryPoint: 'main' },
        });

        // Create bind groups for both directions
        this.bindGroups = [
            device.createBindGroup({
                layout: bindGroupLayout,
                entries: [
                    { binding: 0, resource: this.textures[0].createView() },
                    { binding: 1, resource: this.textures[1].createView() },
                ],
            }),
            device.createBindGroup({
                layout: bindGroupLayout,
                entries: [
                    { binding: 0, resource: this.textures[1].createView() },
                    { binding: 1, resource: this.textures[0].createView() },
                ],
            }),
        ];

        this.currentBuffer = 0;
    }

    randomize(density = 0.3) {
        const size = this.width * this.height;
        const data = new Uint32Array(size);
        for (let i = 0; i < size; i++) {
            data[i] = Math.random() < density ? 1 : 0;
        }

        this.device.queue.writeTexture(
            { texture: this.textures[this.currentBuffer] },
            data,
            { bytesPerRow: this.width * 4 },  // 4 bytes per pixel for r32uint
            { width: this.width, height: this.height }
        );
        this.timestep = 0;
    }

    step() {
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();

        passEncoder.setPipeline(this.computePipeline);
        passEncoder.setBindGroup(0, this.bindGroups[this.currentBuffer]);

        const workgroupsX = Math.ceil(this.width / 16);
        const workgroupsY = Math.ceil(this.height / 16);
        passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);

        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        this.currentBuffer = 1 - this.currentBuffer;
        this.timestep++;
    }

    /**
     * Run multiple steps with SINGLE command submission
     */
    async runSteps(n) {
        const start = performance.now();

        // ALL steps in ONE command encoder
        const commandEncoder = this.device.createCommandEncoder();

        for (let i = 0; i < n; i++) {
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(this.computePipeline);
            passEncoder.setBindGroup(0, this.bindGroups[this.currentBuffer]);

            const workgroupsX = Math.ceil(this.width / 16);
            const workgroupsY = Math.ceil(this.height / 16);
            passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);

            passEncoder.end();

            this.currentBuffer = 1 - this.currentBuffer;
            this.timestep++;
        }

        // Single submission for all steps
        this.device.queue.submit([commandEncoder.finish()]);

        // Wait for completion
        await this.device.queue.onSubmittedWorkDone();

        return performance.now() - start;
    }

    async getState() {
        const width = this.width;
        const height = this.height;

        // Need a new staging buffer if size changed (4 bytes per cell)
        if (this.stagingBuffer.size !== width * height * 4) {
            this.stagingBuffer.destroy();
            this.stagingBuffer = this.device.createBuffer({
                size: width * height * 4,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
            });
        }

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyTextureToBuffer(
            { texture: this.textures[this.currentBuffer] },
            { buffer: this.stagingBuffer, bytesPerRow: width * 4 },
            { width, height }
        );
        this.device.queue.submit([commandEncoder.finish()]);

        await this.stagingBuffer.mapAsync(GPUMapMode.READ);
        const data32 = new Uint32Array(this.stagingBuffer.getMappedRange().slice(0));
        this.stagingBuffer.unmap();

        // Convert to Uint8Array for compatibility with rendering
        const data = new Uint8Array(width * height);
        for (let i = 0; i < data.length; i++) {
            data[i] = data32[i];
        }

        return data;
    }

    async countLive() {
        const state = await this.getState();
        let count = 0;
        for (let i = 0; i < state.length; i++) {
            count += state[i];
        }
        return count;
    }

    async resize(width, height) {
        this.width = width;
        this.height = height;
        this.timestep = 0;
        await this.createResources();
    }

    destroy() {
        if (this.textures) {
            this.textures[0].destroy();
            this.textures[1].destroy();
        }
        if (this.stagingBuffer) {
            this.stagingBuffer.destroy();
        }
    }
}
