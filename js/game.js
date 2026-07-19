/**
 * 游戏引擎模块
 * 使用 Matter.js 实现物理引擎
 * 核心功能：重力下落、碰撞检测、合成逻辑、游戏结束判定
 */

const Game = {
    // Matter.js 模块
    Engine: Matter.Engine,
    Render: Matter.Render,
    Runner: Matter.Runner,
    Bodies: Matter.Bodies,
    Body: Matter.Body,
    Composite: Matter.Composite,
    Events: Matter.Events,

    // 游戏配置
    config: {
        width: 400,           // 画布宽度
        height: 700,          // 画布高度
        wallThickness: 20,    // 墙壁厚度
        dangerLineY: 100,     // 危险线 Y 坐标（调整到更合理的位置）
        dropZoneY: 60,        // 释放区域 Y 坐标
        minSize: 25,          // 最小球尺寸
        sizeIncrement: 6,     // 每级尺寸增量
        gravity: 1.2,         // 重力
        restitution: 0.6,     // 弹性
        friction: 0.05,       // 摩擦力
        frictionAir: 0.01,    // 空气摩擦力
        dropCooldown: 500,    // 释放冷却时间（毫秒）
    },

    // 游戏状态
    state: {
        isRunning: false,
        isPaused: false,
        score: 0,
        highScore: 0,
        currentLevel: 1,
        nextLevel: 1,
        lastDropTime: 0,
        canDrop: true,
        dropX: 0,
        gameOver: false,
    },

    // 物理引擎对象
    engine: null,
    render: null,
    runner: null,

    // 游戏对象
    balls: [],
    walls: [],

    // 图片缓存
    imageCache: {},

    /**
     * 初始化游戏
     * @param {string} canvasId - 画布元素 ID
     */
    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // 设置画布尺寸
        this.canvas.width = this.config.width;
        this.canvas.height = this.config.height;

        // 加载最高分
        this.state.highScore = Utils.storage.get('merge_game_highscore', 0);

        // 初始化音效系统
        Utils.audio.init();

        // 初始化物理引擎
        this.initPhysics();

        // 预加载图片
        this.preloadImages();

        // 绑定事件
        this.bindEvents();

        // 初始化游戏状态
        this.resetState();
    },

    /**
     * 初始化物理引擎
     */
    initPhysics() {
        // 创建引擎（优化配置）
        this.engine = this.Engine.create({
            gravity: { x: 0, y: this.config.gravity },
            // 物理引擎配置
            enableSleeping: true,   // 启用睡眠模式，静止的球不参与计算
            positionIterations: 4,  // 位置迭代次数
            velocityIterations: 3,  // 速度迭代次数
            constraintIterations: 1 // 约束迭代次数
        });

        // 创建墙壁
        this.createWalls();

        // 设置碰撞检测
        this.Events.on(this.engine, 'collisionStart', (event) => {
            this.handleCollision(event);
        });
    },

    /**
     * 创建边界墙壁
     */
    createWalls() {
        const { width, height, wallThickness } = this.config;
        const t = wallThickness;

        // 创建四面墙（左、右、下）
        // 墙壁也需要设置弹性，让球碰撞后会反弹
        this.walls = [
            // 左墙
            this.Bodies.rectangle(t / 2, height / 2, t, height, {
                isStatic: true,
                restitution: 0.5,  // 墙壁弹性
                friction: 0.1,     // 墙壁摩擦力
                render: { visible: false },
                label: 'wall'
            }),
            // 右墙
            this.Bodies.rectangle(width - t / 2, height / 2, t, height, {
                isStatic: true,
                restitution: 0.5,
                friction: 0.1,
                render: { visible: false },
                label: 'wall'
            }),
            // 地板
            this.Bodies.rectangle(width / 2, height - t / 2, width, t, {
                isStatic: true,
                restitution: 0.4,  // 地板弹性稍低
                friction: 0.2,     // 地板摩擦力稍高（让球更容易停下来）
                render: { visible: false },
                label: 'wall'
            })
        ];

        this.Composite.add(this.engine.world, this.walls);
    },

    /**
     * 预加载所有图片
     */
    preloadImages() {
        for (let i = 1; i <= AssetsManager.MAX_LEVEL; i++) {
            const img = new Image();
            img.src = AssetsManager.getAsset(i);
            this.imageCache[i] = img;
        }
    },

    /**
     * 刷新图片缓存
     */
    refreshImageCache() {
        for (let i = 1; i <= AssetsManager.MAX_LEVEL; i++) {
            this.imageCache[i].src = AssetsManager.getAsset(i);
        }
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 鼠标事件
        this.canvas.addEventListener('mousemove', (e) => this.handlePointerMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        // 触摸事件 - 修复手机端不能下落的问题
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handlePointerMove(e);
        }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handlePointerMove(e);
        }, { passive: false });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleClick(e);
        }, { passive: false });
    },

    /**
     * 处理指针移动
     */
    handlePointerMove(event) {
        if (!this.state.isRunning || this.state.gameOver) return;

        const pos = Utils.getEventPosition(event, this.canvas);
        const { wallThickness, width } = this.config;

        // 限制在有效区域内
        this.state.dropX = Math.max(
            wallThickness + 25,
            Math.min(pos.x, width - wallThickness - 25)
        );
    },

    /**
     * 处理点击
     */
    handleClick(event) {
        if (!this.state.isRunning || this.state.gameOver || !this.state.canDrop) return;

        const now = Date.now();
        if (now - this.state.lastDropTime < this.config.dropCooldown) return;

        // 获取点击位置
        const pos = Utils.getEventPosition(event, this.canvas);
        const { wallThickness, width } = this.config;

        // 检查点击是否在画布的 x 范围内（垂直线判断）
        const minX = wallThickness + 25;
        const maxX = width - wallThickness - 25;

        if (pos.x >= minX && pos.x <= maxX) {
            // 更新释放位置（只取 x坐标，y 坐标固定为释放区域）
            this.state.dropX = pos.x;
            this.dropBall();
            this.state.lastDropTime = now;
        }
    },

    /**
     * 获取球的半径
     * @param {number} level - 等级
     * @returns {number}
     */
    getBallRadius(level) {
        return this.config.minSize + (level - 1) * this.config.sizeIncrement;
    },

    /**
     * 生成随机等级（用于下一个预告）
     * @returns {number}
     */
    generateRandomLevel() {
        // 低等级出现概率更高
        const weights = [30, 25, 20, 15, 10, 8, 6, 5, 4, 3, 2];
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) return i + 1;
        }
        return 1;
    },

    /**
     * 释放球
     */
    dropBall() {
        const level = this.state.currentLevel;
        const radius = this.getBallRadius(level);
        const x = this.state.dropX;
        const y = this.config.dropZoneY;

        // 创建物理球体
        const ball = this.Bodies.circle(x, y, radius, {
            restitution: this.config.restitution,  // 弹性
            friction: this.config.friction,          // 摩擦力
            frictionAir: this.config.frictionAir,    // 空气摩擦力
            density: 0.001,                          // 密度
            label: `ball_${level}`,
            render: { visible: false }
        });

        // 存储等级信息和创建时间
        ball.level = level;
        ball.id = Utils.generateId();
        ball.createdAt = Date.now(); // 记录创建时间，用于游戏结束判断

        this.Composite.add(this.engine.world, ball);
        this.balls.push(ball);

        // 播放掉落音效
        Utils.audio.playDrop();

        // 更新当前等级和下一个等级
        this.state.currentLevel = this.state.nextLevel;
        this.state.nextLevel = this.generateRandomLevel();

        // 更新 UI
        this.updateUI();
    },

    /**
     * 处理碰撞事件
     * 当两个相同等级的球碰撞时，触发合成
     */
    handleCollision(event) {
        const pairs = event.pairs;

        for (let i = 0; i < pairs.length; i++) {
            const { bodyA, bodyB } = pairs[i];

            // 检查是否是两个球碰撞（确保不是同一个球）
            if (bodyA.label?.startsWith('ball_') &&
                bodyB.label?.startsWith('ball_') &&
                bodyA.id !== bodyB.id) {

                // 播放弹跳音效（仅球与球碰撞）
                Utils.audio.playBounce();

                // 合成条件：等级相同且未达到最大等级
                if (bodyA.level === bodyB.level && bodyA.level < AssetsManager.MAX_LEVEL) {
                    this.mergeBalls(bodyA, bodyB);
                }
            }
        }
    },

    /**
     * 合并两个球
     */
    mergeBalls(ballA, ballB) {
        const newLevel = ballA.level + 1;

        // 计算新球位置（两个球的中点）
        const x = (ballA.position.x + ballB.position.x) / 2;
        const y = (ballA.position.y + ballB.position.y) / 2;

        // 移除旧球
        this.removeBall(ballA);
        this.removeBall(ballB);

        // 创建新球
        const radius = this.getBallRadius(newLevel);
        const newBall = this.Bodies.circle(x, y, radius, {
            restitution: this.config.restitution,  // 弹性
            friction: this.config.friction,          // 摩擦力
            frictionAir: this.config.frictionAir,    // 空气摩擦力
            density: 0.001,                          // 密度
            label: `ball_${newLevel}`,
            render: { visible: false }
        });

        newBall.level = newLevel;
        newBall.id = Utils.generateId();
        newBall.createdAt = Date.now(); // 合成的球重新计时

        // 添加合成弹力（让球向上跳动）
        this.Body.setVelocity(newBall, { x: 0, y: -5 });

        this.Composite.add(this.engine.world, newBall);
        this.balls.push(newBall);

        // 更新分数
        const score = Utils.calculateScore(newLevel);
        this.state.score += score;

        // 解锁新等级（图鉴功能）
        AssetsManager.unlock(newLevel);

        // 播放音效
        Utils.audio.playMerge(newLevel);

        // 更新最高分
        if (this.state.score > this.state.highScore) {
            this.state.highScore = this.state.score;
            Utils.storage.set('merge_game_highscore', this.state.highScore);
        }

        // 检查游戏结束
        this.checkGameOver();

        // 更新 UI
        this.updateUI();

        // 显示合成特效
        this.showMergeEffect(x, y, newLevel);
    },

    /**
     * 移除球
     */
    removeBall(ball) {
        this.Composite.remove(this.engine.world, ball);
        this.balls = this.balls.filter(b => b.id !== ball.id);
    },

    /**
     * 检查游戏结束（带节流）
     * 判断逻辑：检查所有球中最高的堆积高度是否超过危险线
     * 需要等待球静止后才判断
     */
    checkGameOver() {
        const now = Date.now();
        // 每 500ms 检查一次，减少检查频率
        if (now - (this._lastGameOverCheck || 0) < 500) return;
        this._lastGameOverCheck = now;

        // 至少要有 2 个球才开始检查游戏结束
        if (this.balls.length < 2) return;

        const dangerY = this.config.dangerLineY;

        // 检查所有球
        for (const ball of this.balls) {
            // 获取球的半径（使用配置中的半径计算方式）
            const radius = this.getBallRadius(ball.level);
            // 球的顶部位置 = 球心位置 - 半径
            const ballTop = ball.position.y - radius;

            // 检查球的顶部是否超过虚线（虚线以上）
            // dangerLineY 是虚线的 y坐标，当球的顶部位置 < dangerLineY 时，表示超过虚线
            if (ballTop < dangerY) {
                // 使用速度的平方来判断，避免开方运算
                const speedSquared = ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y;

                // 球必须静止（速度平方小于 0.25，即速度 < 0.5）
                if (speedSquared < 0.25) {
                    this.gameOver();
                    return;
                }
            }
        }
    },

    /**
     * 游戏结束
     */
    gameOver() {
        this.state.gameOver = true;
        this.state.isRunning = false;
        Utils.audio.playGameOver();

        // 触发游戏结束回调
        if (this.onGameOver) {
            this.onGameOver(this.state.score, this.state.highScore);
        }
    },

    /**
     * 显示合成特效
     * @param {number} x - 合成位置 X
     * @param {number} y - 合成位置 Y
     * @param {number} level - 合成后的等级
     */
    showMergeEffect(x, y, level) {
        // 合成动画效果
        const radius = this.getBallRadius(level);
        const colors = this.getLevelColors(level);

        // 创建粒子效果
        const particles = [];
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                life: 1,
                size: 4,
                color: colors[0]
            });
        }

        // 光环效果
        let ringRadius = radius * 0.5;
        let ringOpacity = 1;

        // 动画循环
        let frame = 0;
        const maxFrames = 20;
        const animate = () => {
            frame++;
            if (frame > maxFrames) return;

            const ctx = this.ctx;

            // 绘制粒子
            for (const p of particles) {
                if (p.life > 0) {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life -= 0.05;
                    p.size *= 0.95;

                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.life;
                    ctx.fill();
                }
            }

            // 绘制扩散光环
            ringRadius += 2;
            ringOpacity -= 0.05;
            if (ringOpacity > 0) {
                ctx.beginPath();
                ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
                ctx.strokeStyle = colors[0];
                ctx.lineWidth = 2;
                ctx.globalAlpha = ringOpacity;
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
            requestAnimationFrame(animate);
        };
        animate();
    },

    /**
     * 更新 UI
     */
    updateUI() {
        if (this.onUpdateUI) {
            this.onUpdateUI({
                score: this.state.score,
                highScore: this.state.highScore,
                currentLevel: this.state.currentLevel,
                nextLevel: this.state.nextLevel
            });
        }
    },

    /**
     * 开始游戏
     */
    start() {
        this.state.isRunning = true;
        this.state.gameOver = false;
        this.state.canDrop = true;

        // 启动物理引擎
        this.runner = this.Runner.create();
        this.Runner.run(this.runner, this.engine);

        // 开始渲染循环
        this.renderLoop();
    },

    /**
     * 渲染循环
     */
    renderLoop() {
        // 游戏结束后停止渲染循环
        if (this.state.gameOver) {
            this.draw(); // 最后绘制一次遮罩
            return;
        }

        if (!this.state.isRunning) return;

        // 检查游戏结束
        this.checkGameOver();

        this.draw();
        requestAnimationFrame(() => this.renderLoop());
    },

    /**
     * 绘制游戏画面
     */
    draw() {
        const ctx = this.ctx;
        const { width, height, dangerLineY } = this.config;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 绘制背景
        ctx.fillStyle = '#FAFAFA';
        ctx.fillRect(0, 0, width, height);

        // 绘制危险线（虚线）
        ctx.beginPath();
        ctx.setLineDash([10, 5]);
        ctx.moveTo(0, dangerLineY);
        ctx.lineTo(width, dangerLineY);
        ctx.strokeStyle = '#FF6B6B';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        // 绘制释放位置指示器（仅在游戏运行时）
        if (this.state.isRunning && !this.state.gameOver) {
            this.drawDropIndicator();
        }

        // 绘制所有球
        const balls = this.balls;
        for (let i = 0, len = balls.length; i < len; i++) {
            this.drawBall(balls[i]);
        }

        // 如果游戏结束，绘制半透明遮罩
        if (this.state.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, width, height);
        }
    },

    /**
     * 绘制释放位置指示器
     */
    drawDropIndicator() {
        const ctx = this.ctx;
        const x = this.state.dropX;
        const y = this.config.dropZoneY;
        const level = this.state.currentLevel;
        const radius = this.getBallRadius(level);

        // 绘制虚线
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(x, y + radius);
        ctx.lineTo(x, this.config.dangerLineY);
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        // 绘制预览球
        ctx.globalAlpha = 0.6;
        this.drawBallAt(x, y, level);
        ctx.globalAlpha = 1.0;
    },

    /**
     * 绘制球
     */
    drawBall(ball) {
        this.drawBallAt(ball.position.x, ball.position.y, ball.level);
    },

    /**
     * 在指定位置绘制球
     */
    drawBallAt(x, y, level) {
        const ctx = this.ctx;
        const radius = this.getBallRadius(level);
        const img = this.imageCache[level];

        if (img && img.complete) {
            // 绘制图片（使用圆形裁剪）
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
            ctx.restore();

            // 绘制边框
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // 备用绘制（渐变色圆形）
            const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
            const colors = this.getLevelColors(level);
            gradient.addColorStop(0, colors[0]);
            gradient.addColorStop(1, colors[1]);

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 绘制等级文字
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${radius * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(level.toString(), x, y);
        }
    },

    /**
     * 获取等级颜色
     */
    getLevelColors(level) {
        const colors = [
            ['#FF6B6B', '#EE5A24'],  // 红色
            ['#FFA502', '#F39C12'],  // 橙色
            ['#FECA57', '#FF9FF3'],  // 黄粉
            ['#48DBFB', '#0ABDE3'],  // 青色
            ['#FF9FF3', '#F368E0'],  // 粉色
            ['#54A0FF', '#2E86DE'],  // 蓝色
            ['#5F27CD', '#341F97'],  // 紫色
            ['#01A3A4', '#00B894'],  // 绿松石
            ['#F97F51', '#EAB543'],  // 橙黄
            ['#B33771', '#6D214F'],  // 深紫
            ['#1B9CFC', '#182C61'],  // 深蓝
        ];
        return colors[(level - 1) % colors.length];
    },

    /**
     * 重置游戏状态
     */
    resetState() {
        this.state.score = 0;
        this.state.currentLevel = this.generateRandomLevel();
        this.state.nextLevel = this.generateRandomLevel();
        this.state.gameOver = false;
        this.state.lastDropTime = 0;
        this.state.dropX = this.config.width / 2;

        // 清除所有球
        for (const ball of [...this.balls]) {
            this.removeBall(ball);
        }
        this.balls = [];
    },

    /**
     * 重新开始游戏
     */
    restart() {
        // 停止当前引擎
        if (this.runner) {
            this.Runner.stop(this.runner);
        }

        // 重置物理引擎
        this.Composite.clear(this.engine.world);
        this.createWalls();

        // 重置状态
        this.resetState();

        // 更新 UI
        this.updateUI();

        // 重新开始
        this.start();
    },

    /**
     * 暂停游戏
     */
    pause() {
        this.state.isPaused = true;
        if (this.runner) {
            this.Runner.stop(this.runner);
        }
    },

    /**
     * 继续游戏
     */
    resume() {
        this.state.isPaused = false;
        if (this.runner) {
            this.Runner.run(this.runner, this.engine);
        }
    },

    /**
     * 销毁游戏
     */
    destroy() {
        if (this.runner) {
            this.Runner.stop(this.runner);
        }
        this.state.isRunning = false;
        this.balls = [];
    }
};
