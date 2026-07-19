/**
 * UI 控制模块
 * 管理界面交互和显示
 * 功能包括：
 * - 游戏界面初始化和切换
 * - 分数显示更新
 * - 素材管理弹窗
 * - 图鉴弹窗
 * - 游戏结束弹窗
 * - 事件绑定和回调处理
 */

const UI = {
    // DOM 元素缓存（避免重复查询DOM）
    elements: {},

    /**
     * 初始化 UI
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupGameCallbacks();
    },

    /**
     * 缓存 DOM 元素
     */
    cacheElements() {
        this.elements = {
            // 游戏相关
            canvas: document.getElementById('gameCanvas'),
            scoreDisplay: document.getElementById('score'),
            highScoreDisplay: document.getElementById('highScore'),
            nextLevelPreview: document.getElementById('nextLevel'),
            startBtn: document.getElementById('startBtn'),
            restartBtn: document.getElementById('restartBtn'),

            // 弹窗
            gameOverModal: document.getElementById('gameOverModal'),
            finalScore: document.getElementById('finalScore'),
            finalHighScore: document.getElementById('finalHighScore'),
            playAgainBtn: document.getElementById('playAgainBtn'),

            // 素材管理
            settingsBtn: document.getElementById('settingsBtn'),
            settingsBtnStart: document.getElementById('settingsBtnStart'),
            assetsModal: document.getElementById('assetsModal'),
            assetsGrid: document.getElementById('assetsGrid'),
            closeAssetsBtn: document.getElementById('closeAssetsBtn'),
            batchUploadBtn: document.getElementById('batchUploadBtn'),
            resetAssetsBtn: document.getElementById('resetAssetsBtn'),
            batchFileInput: document.getElementById('batchFileInput'),

            // 图鉴
            collectionBtn: document.getElementById('collectionBtn'),
            collectionBtnStart: document.getElementById('collectionBtnStart'),
            collectionModal: document.getElementById('collectionModal'),
            collectionGrid: document.getElementById('collectionGrid'),
            closeCollectionBtn: document.getElementById('closeCollectionBtn'),
            unlockCount: document.getElementById('unlockCount'),

            // 开始页面
            startScreen: document.getElementById('startScreen'),
            gameScreen: document.getElementById('gameScreen'),
        };
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 开始按钮
        this.elements.startBtn?.addEventListener('click', () => this.startGame());

        // 重新开始按钮
        this.elements.restartBtn?.addEventListener('click', () => this.restartGame());

        // 再来一局按钮
        this.elements.playAgainBtn?.addEventListener('click', () => {
            this.hideModal('gameOverModal');
            this.restartGame();
        });

        // 设置按钮（游戏中）
        this.elements.settingsBtn?.addEventListener('click', () => this.showAssetsModal());

        // 设置按钮（开始页面）
        this.elements.settingsBtnStart?.addEventListener('click', () => this.showAssetsModal());

        // 关闭素材管理
        this.elements.closeAssetsBtn?.addEventListener('click', () => this.hideModal('assetsModal'));

        // 批量上传
        this.elements.batchUploadBtn?.addEventListener('click', () => {
            this.elements.batchFileInput.click();
        });

        this.elements.batchFileInput?.addEventListener('change', (e) => this.handleBatchUpload(e));

        // 重置素材
        this.elements.resetAssetsBtn?.addEventListener('click', () => this.resetAssets());

        // 图鉴按钮（游戏中）
        this.elements.collectionBtn?.addEventListener('click', () => this.showCollectionModal());

        // 图鉴按钮（开始页面）
        this.elements.collectionBtnStart?.addEventListener('click', () => this.showCollectionModal());

        // 关闭图鉴
        this.elements.closeCollectionBtn?.addEventListener('click', () => this.hideModal('collectionModal'));

        // 点击弹窗外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    },

    /**
     * 设置游戏回调
     */
    setupGameCallbacks() {
        Game.onUpdateUI = (data) => this.updateGameUI(data);
        Game.onGameOver = (score, highScore) => this.showGameOverModal(score, highScore);
    },

    /**
     * 开始游戏
     */
    startGame() {
        this.elements.startScreen.style.display = 'none';
        this.elements.gameScreen.style.display = 'block';

        Game.init('gameCanvas');
        Game.start();
        this.updateGameUI({
            score: 0,
            highScore: Game.state.highScore,
            currentLevel: Game.state.currentLevel,
            nextLevel: Game.state.nextLevel
        });
    },

    /**
     * 重新开始游戏
     */
    restartGame() {
        Game.restart();
    },

    /**
     * 更新游戏 UI
     */
    updateGameUI(data) {
        if (this.elements.scoreDisplay) {
            this.elements.scoreDisplay.textContent = Utils.formatNumber(data.score);
        }
        if (this.elements.highScoreDisplay) {
            this.elements.highScoreDisplay.textContent = Utils.formatNumber(data.highScore);
        }
        if (this.elements.nextLevelPreview) {
            const img = AssetsManager.getAsset(data.nextLevel);
            this.elements.nextLevelPreview.src = img;
            this.elements.nextLevelPreview.alt = `等级 ${data.nextLevel}`;
        }
    },

    /**
     * 显示游戏结束弹窗
     */
    showGameOverModal(score, highScore) {
        if (this.elements.finalScore) {
            this.elements.finalScore.textContent = Utils.formatNumber(score);
        }
        if (this.elements.finalHighScore) {
            this.elements.finalHighScore.textContent = Utils.formatNumber(highScore);
        }
        this.showModal('gameOverModal');
    },

    /**
     * 显示素材管理弹窗
     */
    showAssetsModal() {
        this.renderAssetsGrid();
        this.showModal('assetsModal');
    },

    /**
     * 渲染素材网格
     */
    renderAssetsGrid() {
        const grid = this.elements.assetsGrid;
        if (!grid) return;

        grid.innerHTML = '';

        const assets = AssetsManager.getAssetsList();
        assets.forEach(asset => {
            const item = document.createElement('div');
            item.className = 'asset-item';
            item.innerHTML = `
                <div class="asset-level">Lv.${asset.level}</div>
                <img src="${asset.data}" alt="等级 ${asset.level}" class="asset-preview">
                <input type="file" accept="image/*" class="asset-file-input" data-level="${asset.level}" style="display:none;">
                <button class="asset-replace-btn" data-level="${asset.level}">替换</button>
            `;

            // 绑定替换按钮
            const replaceBtn = item.querySelector('.asset-replace-btn');
            const fileInput = item.querySelector('.asset-file-input');

            replaceBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleSingleUpload(e, asset.level));

            grid.appendChild(item);
        });
    },

    /**
     * 处理单张上传
     */
    async handleSingleUpload(event, level) {
        const file = event.target.files[0];
        if (!file) return;

        const success = await AssetsManager.singleUpload(file, level);
        if (success) {
            this.renderAssetsGrid();
            Game.refreshImageCache();
        }
    },

    /**
     * 处理批量上传
     */
    async handleBatchUpload(event) {
        const files = event.target.files;
        if (!files.length) return;

        const count = await AssetsManager.batchUpload(files);
        if (count > 0) {
            this.renderAssetsGrid();
            Game.refreshImageCache();
            alert(`成功上传 ${count} 张图片`);
        }
    },

    /**
     * 重置素材
     */
    resetAssets() {
        if (confirm('确定要恢复默认素材吗？')) {
            AssetsManager.resetToDefault();
            this.renderAssetsGrid();
            Game.refreshImageCache();
        }
    },

    /**
     * 显示图鉴弹窗
     */
    showCollectionModal() {
        this.renderCollectionGrid();
        this.showModal('collectionModal');
    },

    /**
     * 渲染图鉴网格
     */
    renderCollectionGrid() {
        const grid = this.elements.collectionGrid;
        if (!grid) return;

        grid.innerHTML = '';

        const assets = AssetsManager.getAssetsList();
        const unlockCount = AssetsManager.getUnlockCount();

        // 更新解锁数量
        if (this.elements.unlockCount) {
            this.elements.unlockCount.textContent = unlockCount;
        }

        assets.forEach(asset => {
            const item = document.createElement('div');
            item.className = `collection-item ${asset.unlocked ? 'unlocked' : 'locked'}`;
            item.innerHTML = `
                <div class="collection-level">Lv.${asset.level}</div>
                <img src="${asset.data}" alt="等级 ${asset.level}" class="collection-preview">
                <div class="collection-status">${asset.unlocked ? '✓ 已解锁' : '🔒 未解锁'}</div>
            `;
            grid.appendChild(item);
        });
    },

    /**
     * 显示弹窗
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    },

    /**
     * 隐藏弹窗
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }
};
