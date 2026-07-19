/**
 * 工具函数模块
 * 提供通用的辅助功能，包括：
 * - 唯一ID生成
 * - 节流/防抖函数
 * - 图片裁剪（圆形）
 * - 默认素材生成
 * - 分数计算
 * - 本地存储封装
 * - 音效管理
 */

const Utils = {
    /**
     * 生成唯一ID
     * 使用时间戳 + 随机数确保唯一性
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} limit - 节流间隔（毫秒）
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 防抖等待时间（毫秒）
     */
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /**
     * 将图片裁剪为圆形并返回 base64
     * @param {File} file - 图片文件
     * @param {number} size - 输出尺寸
     * @returns {Promise<string>} base64 数据
     */
    cropToCircle(file, size = 200) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');

                    // 计算裁剪区域（居中正方形）
                    const minDim = Math.min(img.width, img.height);
                    const sx = (img.width - minDim) / 2;
                    const sy = (img.height - minDim) / 2;

                    // 绘制圆形裁剪
                    ctx.beginPath();
                    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();

                    // 绘制图片
                    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * 生成默认素材（渐变色圆形 + 数字）
     * @param {number} level - 等级 (1-11)
     * @param {number} size - 图片尺寸
     * @returns {string} base64 数据
     */
    generateDefaultAsset(level, size = 200) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // 11 种渐变色方案
        const gradients = [
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

        const [color1, color2] = gradients[(level - 1) % gradients.length];

        // 创建渐变
        const gradient = ctx.createRadialGradient(
            size * 0.3, size * 0.3, 0,
            size / 2, size / 2, size / 2
        );
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);

        // 绘制圆形
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // 添加边框
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 添加高光效果
        const highlight = ctx.createRadialGradient(
            size * 0.35, size * 0.35, 0,
            size * 0.35, size * 0.35, size * 0.3
        );
        highlight.addColorStop(0, 'rgba(255,255,255,0.4)');
        highlight.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
        ctx.fillStyle = highlight;
        ctx.fill();

        // 绘制等级数字
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${size * 0.35}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.fillText(level.toString(), size / 2, size / 2);

        return canvas.toDataURL('image/png');
    },

    /**
     * 计算合成得分
     * @param {number} level - 合成后的等级
     * @returns {number} 得分
     */
    calculateScore(level) {
        // 等级越高得分越多：level * 10
        return level * 10;
    },

    /**
     * 格式化数字（添加千位分隔符）
     * @param {number} num - 数字
     * @returns {string} 格式化后的字符串
     */
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * 检测是否为移动设备
     * @returns {boolean}
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    /**
     * 获取触摸/鼠标位置
     * @param {Event} event - 事件对象
     * @param {HTMLCanvasElement} canvas - 画布元素
     * @returns {{x: number, y: number}}
     */
    getEventPosition(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if (event.touches && event.touches[0]) {
            return {
                x: (event.touches[0].clientX - rect.left) * scaleX,
                y: (event.touches[0].clientY - rect.top) * scaleY
            };
        }

        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    },

    /**
     * localStorage 封装
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            } catch (e) {
                console.error('读取本地存储失败:', e);
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('写入本地存储失败:', e);
                if (e.name === 'QuotaExceededError') {
                    alert('本地存储空间已满，请清理一些数据或减小图片尺寸');
                }
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('删除本地存储失败:', e);
                return false;
            }
        }
    },

    /**
     * 音效管理
     */
    audio: {
        // 音量
        volume: 0.5,
        // 复用的 AudioContext
        audioCtx: null,
        // 上次播放弹跳音效的时间
        lastBounceTime: 0,
        // 弹跳音效最小间隔（毫秒）
        bounceThrottle: 50,
        // 是否启用音效（file:// 协议下禁用）
        enabled: true,

        /**
         * 初始化音效系统
         */
        init() {
            // 检测是否在 file:// 协议下
            if (window.location.protocol === 'file:') {
                this.enabled = false;
                console.warn('音效已在 file:// 协议下禁用。请使用 HTTP 服务器访问以启用音效。');
            }
            this.audioCtx = null;
        },

        /**
         * 获取或创建 AudioContext
         */
        getAudioCtx() {
            if (!this.enabled) return null;

            try {
                if (!this.audioCtx) {
                    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                // 如果状态是 suspended，尝试恢复
                if (this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
                return this.audioCtx;
            } catch (e) {
                this.enabled = false;
                return null;
            }
        },

        /**
         * 播放合成音效（欢快的上升音调）
         * @param {number} level - 等级
         */
        playMerge(level) {
            const audioCtx = this.getAudioCtx();
            if (!audioCtx) return;

            try {
                const now = audioCtx.currentTime;

                // 创建欢快的上升音效
                const notes = [523, 659, 784]; // C5, E5, G5 - 大三和弦
                notes.forEach((freq, i) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);

                    osc.frequency.value = freq + (level * 30);
                    osc.type = 'sine';

                    gain.gain.setValueAtTime(0, now + i * 0.08);
                    gain.gain.linearRampToValueAtTime(this.volume * 0.3, now + i * 0.08 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.15);

                    osc.start(now + i * 0.08);
                    osc.stop(now + i * 0.08 + 0.15);
                });
            } catch (e) {
                // 静默失败
            }
        },

        /**
         * 播放掉落音效
         */
        playDrop() {
            const audioCtx = this.getAudioCtx();
            if (!audioCtx) return;

            try {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
                osc.type = 'sine';

                gain.gain.setValueAtTime(this.volume * 0.2, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.1);
            } catch (e) {
                // 静默失败
            }
        },

        /**
         * 播放弹跳音效（带节流）
         */
        playBounce() {
            if (!this.enabled) return;

            const now = Date.now();
            if (now - this.lastBounceTime < this.bounceThrottle) return;
            this.lastBounceTime = now;

            const audioCtx = this.getAudioCtx();
            if (!audioCtx) return;

            try {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.frequency.setValueAtTime(800, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.05);
                osc.type = 'sine';

                gain.gain.setValueAtTime(this.volume * 0.1, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.05);
            } catch (e) {
                // 静默失败
            }
        },

        /**
         * 播放游戏结束音效
         */
        playGameOver() {
            const audioCtx = this.getAudioCtx();
            if (!audioCtx) return;

            try {
                const now = audioCtx.currentTime;

                // 下降音效
                const notes = [523, 392, 330, 262]; // C5, G4, E4, C4
                notes.forEach((freq, i) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);

                    osc.frequency.value = freq;
                    osc.type = 'triangle';

                    gain.gain.setValueAtTime(0, now + i * 0.15);
                    gain.gain.linearRampToValueAtTime(this.volume * 0.3, now + i * 0.15 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.2);

                    osc.start(now + i * 0.15);
                    osc.stop(now + i * 0.15 + 0.2);
                });
            } catch (e) {
                // 静默失败
            }
        }
    }
};
