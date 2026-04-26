/**
 * WebGPU Game of Life Implementation
 * Uses compute shaders for parallel cell updates
 */

export class LifeWebGPU {
    constructor() {
        this.device = null;
        this.width = 0;
        this.height = 0;
        this.timestep = 0;

        // GPU resources
        this.cellBuffers = null;  // Double buffer [0] and [1]
        this.uniformBuffer = null;
        this.computePipeline = null;
        this.bindGroups = null;  // [0] reads from buffer 0, writes to 1; [1] vice versa

        // For rendering
        this.renderPipeline = null;
        this.renderBindGroups = null;
        this.vertexBuffer = null;

        // Track which buffer is current
        this.currentBuffer = 0;
    }

    /**
     * Initialize WebGPU
     */
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

    /**
     * Create GPU buffers and pipelines
     */
    async createResources() {
        const device = this.device;
        const size = this.width * this.height;

        // Cell state buffers (double buffered)
        this.cellBuffers = [
            device.createBuffer({
                size: size * 4,  // Uint32 per cell for alignment
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            }),
            device.createBuffer({
                size: size * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            }),
        ];

        // Uniform buffer for grid dimensions
        this.uniformBuffer = device.createBuffer({
            size: 8,  // 2 x u32
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.uniformBuffer, 0, new Uint32Array([this.width, this.height]));

        // Compute shader
        const computeShader = device.createShaderModule({
            code: `
                struct Uniforms {
                    width: u32,
                    height: u32,
                }

                @group(0) @binding(0) var<uniform> uniforms: Uniforms;
                @group(0) @binding(1) var<storage, read> cellsIn: array<u32>;
                @group(0) @binding(2) var<storage, read_write> cellsOut: array<u32>;

                fn getCell(x: i32, y: i32) -> u32 {
                    let w = i32(uniforms.width);
                    let h = i32(uniforms.height);
                    // Wrap around (toroidal)
                    let wx = ((x % w) + w) % w;
                    let wy = ((y % h) + h) % h;
                    return cellsIn[u32(wy) * uniforms.width + u32(wx)];
                }

                @compute @workgroup_size(8, 8)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let x = id.x;
                    let y = id.y;

                    if (x >= uniforms.width || y >= uniforms.height) {
                        return;
                    }

                    let ix = i32(x);
                    let iy = i32(y);

                    // Count neighbors
                    var neighbors: u32 = 0u;
                    neighbors += getCell(ix - 1, iy - 1);
                    neighbors += getCell(ix,     iy - 1);
                    neighbors += getCell(ix + 1, iy - 1);
                    neighbors += getCell(ix - 1, iy);
                    neighbors += getCell(ix + 1, iy);
                    neighbors += getCell(ix - 1, iy + 1);
                    neighbors += getCell(ix,     iy + 1);
                    neighbors += getCell(ix + 1, iy + 1);

                    let idx = y * uniforms.width + x;
                    let alive = cellsIn[idx];

                    // Conway's rules
                    var next: u32 = 0u;
                    if (alive == 1u) {
                        if (neighbors == 2u || neighbors == 3u) {
                            next = 1u;
                        }
                    } else {
                        if (neighbors == 3u) {
                            next = 1u;
                        }
                    }

                    cellsOut[idx] = next;
                }
            `,
        });

        // Compute pipeline
        const computeBindGroupLayout = device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            ],
        });

        this.computePipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [computeBindGroupLayout] }),
            compute: { module: computeShader, entryPoint: 'main' },
        });

        // Create bind groups for both directions
        this.bindGroups = [
            device.createBindGroup({
                layout: computeBindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBuffer } },
                    { binding: 1, resource: { buffer: this.cellBuffers[0] } },
                    { binding: 2, resource: { buffer: this.cellBuffers[1] } },
                ],
            }),
            device.createBindGroup({
                layout: computeBindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBuffer } },
                    { binding: 1, resource: { buffer: this.cellBuffers[1] } },
                    { binding: 2, resource: { buffer: this.cellBuffers[0] } },
                ],
            }),
        ];

        this.currentBuffer = 0;
    }

    /**
     * Initialize with random state
     */
    randomize(density = 0.3) {
        const size = this.width * this.height;
        const data = new Uint32Array(size);
        for (let i = 0; i < size; i++) {
            data[i] = Math.random() < density ? 1 : 0;
        }
        this.device.queue.writeBuffer(this.cellBuffers[this.currentBuffer], 0, data);
        this.timestep = 0;
    }

    /**
     * Advance simulation by one timestep
     */
    step() {
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();

        passEncoder.setPipeline(this.computePipeline);
        passEncoder.setBindGroup(0, this.bindGroups[this.currentBuffer]);

        // Dispatch workgroups (ceiling division)
        const workgroupsX = Math.ceil(this.width / 8);
        const workgroupsY = Math.ceil(this.height / 8);
        passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);

        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);

        // Swap buffers
        this.currentBuffer = 1 - this.currentBuffer;
        this.timestep++;
    }

    /**
     * Run multiple steps and wait for completion
     * @returns {number} Time taken in milliseconds
     */
    async runSteps(n) {
        const start = performance.now();

        // Batch commands for better performance
        const batchSize = 100;
        for (let batch = 0; batch < n; batch += batchSize) {
            const stepsInBatch = Math.min(batchSize, n - batch);

            const commandEncoder = this.device.createCommandEncoder();

            for (let i = 0; i < stepsInBatch; i++) {
                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(this.computePipeline);
                passEncoder.setBindGroup(0, this.bindGroups[this.currentBuffer]);

                const workgroupsX = Math.ceil(this.width / 8);
                const workgroupsY = Math.ceil(this.height / 8);
                passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);

                passEncoder.end();

                this.currentBuffer = 1 - this.currentBuffer;
                this.timestep++;
            }

            this.device.queue.submit([commandEncoder.finish()]);
        }

        // Wait for GPU to finish
        await this.device.queue.onSubmittedWorkDone();

        return performance.now() - start;
    }

    /**
     * Read state back from GPU (slow, for rendering/counting)
     */
    async getState() {
        const size = this.width * this.height;

        // Create staging buffer for readback
        const stagingBuffer = this.device.createBuffer({
            size: size * 4,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.cellBuffers[this.currentBuffer], 0,
            stagingBuffer, 0,
            size * 4
        );
        this.device.queue.submit([commandEncoder.finish()]);

        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const data = new Uint32Array(stagingBuffer.getMappedRange().slice(0));
        stagingBuffer.unmap();
        stagingBuffer.destroy();

        // Convert to Uint8Array for compatibility
        const result = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
            result[i] = data[i];
        }
        return result;
    }

    /**
     * Count live cells (requires GPU readback)
     */
    async countLive() {
        const state = await this.getState();
        let count = 0;
        for (let i = 0; i < state.length; i++) {
            count += state[i];
        }
        return count;
    }

    /**
     * Resize grid
     */
    async resize(width, height) {
        this.width = width;
        this.height = height;
        this.timestep = 0;
        await this.createResources();
    }

    /**
     * Clean up GPU resources
     */
    destroy() {
        if (this.cellBuffers) {
            this.cellBuffers[0].destroy();
            this.cellBuffers[1].destroy();
        }
        if (this.uniformBuffer) {
            this.uniformBuffer.destroy();
        }
    }
}
