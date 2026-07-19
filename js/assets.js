/**
 * 素材管理模块
 * 管理游戏中的图片素材，支持自定义上传
 * 功能包括：
 * - 11个等级的素材存储和管理
 * - 单张/批量图片上传
 * - 自动裁剪为圆形
 * - 图鉴解锁状态管理
 * - 本地持久化存储（localStorage）
 */

const AssetsManager = {
    // 存储键名（用于 localStorage）
    STORAGE_KEY: 'merge_game_assets',
    UNLOCK_KEY: 'merge_game_unlocks',

    // 最大等级（对应合成大西瓜的11种水果）
    MAX_LEVEL: 11,

    // 当前素材数据（base64格式）
    assets: {},

    // 解锁状态（记录哪些等级已被合成过）
    unlocks: {},

    /**
     * 初始化素材管理器
     */
    init() {
        this.loadAssets();
        this.loadUnlocks();
    },

    /**
     * 加载素材
     */
    loadAssets() {
        const saved = Utils.storage.get(this.STORAGE_KEY);
        if (saved && Object.keys(saved).length === this.MAX_LEVEL) {
            this.assets = saved;
        } else {
            this.resetToDefault();
        }
    },

    /**
     * 加载解锁状态
     */
    loadUnlocks() {
        this.unlocks = Utils.storage.get(this.UNLOCK_KEY, {});
    },

    /**
     * 保存素材到本地存储
     */
    saveAssets() {
        Utils.storage.set(this.STORAGE_KEY, this.assets);
    },

    /**
     * 保存解锁状态
     */
    saveUnlocks() {
        Utils.storage.set(this.UNLOCK_KEY, this.unlocks);
    },

    /**
     * 重置为默认素材
     */
    resetToDefault() {
        this.assets = {};
        for (let i = 1; i <= this.MAX_LEVEL; i++) {
            this.assets[i] = Utils.generateDefaultAsset(i);
        }
        this.saveAssets();
    },

    /**
     * 获取指定等级的素材
     * @param {number} level - 等级 (1-11)
     * @returns {string} base64 数据
     */
    getAsset(level) {
        return this.assets[level] || Utils.generateDefaultAsset(level);
    },

    /**
     * 设置指定等级的素材
     * @param {number} level - 等级 (1-11)
     * @param {string} data - base64 数据
     */
    setAsset(level, data) {
        if (level >= 1 && level <= this.MAX_LEVEL) {
            this.assets[level] = data;
            this.saveAssets();
        }
    },

    /**
     * 解锁指定等级
     * @param {number} level - 等级
     */
    unlock(level) {
        if (!this.unlocks[level]) {
            this.unlocks[level] = true;
            this.saveUnlocks();
        }
    },

    /**
     * 检查等级是否已解锁
     * @param {number} level - 等级
     * @returns {boolean}
     */
    isUnlocked(level) {
        return this.unlocks[level] === true;
    },

    /**
     * 获取解锁数量
     * @returns {number}
     */
    getUnlockCount() {
        return Object.keys(this.unlocks).length;
    },

    /**
     * 批量上传图片
     * @param {FileList} files - 文件列表
     * @returns {Promise<number>} 成功上传的数量
     */
    async batchUpload(files) {
        let count = 0;
        const fileArray = Array.from(files);

        for (let i = 0; i < Math.min(fileArray.length, this.MAX_LEVEL); i++) {
            try {
                const base64 = await Utils.cropToCircle(fileArray[i]);
                this.setAsset(i + 1, base64);
                count++;
            } catch (e) {
                console.error(`上传第 ${i + 1} 张图片失败:`, e);
            }
        }

        return count;
    },

    /**
     * 上传单张图片到指定等级
     * @param {File} file - 图片文件
     * @param {number} level - 等级
     * @returns {Promise<boolean>} 是否成功
     */
    async singleUpload(file, level) {
        try {
            const base64 = await Utils.cropToCircle(file);
            this.setAsset(level, base64);
            return true;
        } catch (e) {
            console.error(`上传图片到等级 ${level} 失败:`, e);
            return false;
        }
    },

    /**
     * 获取素材预览信息
     * @returns {Array} 素材信息数组
     */
    getAssetsList() {
        const list = [];
        for (let i = 1; i <= this.MAX_LEVEL; i++) {
            list.push({
                level: i,
                data: this.getAsset(i),
                unlocked: this.isUnlocked(i)
            });
        }
        return list;
    },

    /**
     * 清除所有数据
     */
    clearAll() {
        Utils.storage.remove(this.STORAGE_KEY);
        Utils.storage.remove(this.UNLOCK_KEY);
        this.assets = {};
        this.unlocks = {};
        this.resetToDefault();
    }
};
