<template>
  <div class="app-container">
    <!-- 登录/注册页面 -->
    <div v-if="!isLoggedIn" class="login-container">
      <div class="login-box">
        <div class="login-header">
          <h1>族谱查询系统</h1>
          <p>{{ isRegisterMode ? '注册新账号' : '请登录以继续' }}</p>
        </div>
        
        <!-- 登录表单 -->
        <div v-if="!isRegisterMode" class="login-form">
          <div class="form-group">
            <label>账号</label>
            <input v-model="loginForm.username" type="text" placeholder="请输入账号" @keyup.enter="handleLogin" />
          </div>
          <div class="form-group">
            <label>密码</label>
            <div class="password-input-wrapper">
              <input 
                v-model="loginForm.password" 
                :type="showPassword ? 'text' : 'password'" 
                placeholder="请输入密码" 
                @keyup.enter="handleLogin" 
              />
              <button type="button" class="toggle-password-btn" @click="showPassword = !showPassword" :title="showPassword ? '隐藏密码' : '显示密码'">
                <svg v-if="!showPassword" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="remember-password">
            <label class="checkbox-label">
              <input type="checkbox" v-model="rememberPassword" />
              <span class="checkbox-text">记住密码</span>
            </label>
          </div>
          <button class="login-btn" @click="handleLogin">登 录</button>
          <div class="login-links">
            <span class="link" @click="isRegisterMode = true">注册新账号</span>
          </div>
        </div>
        
        <!-- 注册表单 -->
        <div v-else class="login-form">
          <div class="form-group">
            <label>用户名 *</label>
            <input v-model="registerForm.username" type="text" placeholder="请输入用户名" />
          </div>
          <div class="form-group">
            <label>真实姓名 *</label>
            <input v-model="registerForm.real_name" type="text" placeholder="请输入真实姓名（用于关联族谱）" />
          </div>
          <div class="form-group">
            <label>邮箱 *</label>
            <input v-model="registerForm.email" type="email" placeholder="请输入邮箱" />
          </div>
          <div class="form-group">
            <label>密码 *</label>
            <input v-model="registerForm.password" type="password" placeholder="请输入密码" />
          </div>
          <div class="form-group">
            <label>确认密码 *</label>
            <input v-model="registerForm.confirmPassword" type="password" placeholder="请再次输入密码" />
          </div>
          <button class="login-btn" @click="handleRegister">提交注册申请</button>
          <div class="login-links">
            <span class="link" @click="isRegisterMode = false">返回登录</span>
          </div>
          <p class="register-tip">注册需要管理员审批，真实姓名用于关联您在族谱中的身份，以便编辑个人资料</p>
        </div>
      </div>
    </div>

    <!-- 主界面 -->
    <template v-else>
      <!-- 左侧菜单 -->
      <div v-if="showMenu" class="menu-overlay" @click.self="showMenu = false">
        <div class="side-menu resizable-panel" :class="{ 'expanded': showRelationSubMenu }" :style="{ width: menuWidth + 'px' }">
          <div class="resize-handle" @mousedown="startResizeMenu"></div>
          <div class="menu-header">
            <h3>菜单</h3>
            <button class="close-btn" @click="showMenu = false">✕</button>
          </div>
          <div class="menu-content">
            <!-- 关系查询菜单项 -->
            <div class="menu-item" :class="{ 'active': showRelationSubMenu }" @click="toggleRelationSubMenu">
              <span>关系查询</span>
              <span class="menu-arrow">{{ showRelationSubMenu ? '▼' : '▶' }}</span>
            </div>
            
            <!-- 关系查询子菜单 -->
            <div v-if="showRelationSubMenu" class="relation-submenu">
              <div class="relation-submenu-content">
                <!-- 人物A选择 -->
                <div class="relation-select-group">
                  <label>人物 A</label>
                  <div class="relation-input-box">
                    <input 
                      v-model="relationPersonASearch"
                      type="text"
                      placeholder="输入姓名或拼音首字母..."
                      class="relation-input"
                      @input="onRelationAInput"
                      @focus="showRelationADropdown = true"
                    />
                    <button v-if="relationPersonA" class="clear-input-btn" @click="clearRelationA">✕</button>
                    <button class="pick-tree-btn" @click="startRelationSelect('A')" title="从族谱中选择">选</button>
                  </div>
                  <div v-if="relationPersonA" class="selected-person-tag">
                    <span class="tag-avatar" :class="{ male: relationPersonA.gender === 'M', female: relationPersonA.gender === 'F' }">
                      {{ relationPersonA.name.charAt(0) }}
                    </span>
                    <span class="tag-name">{{ relationPersonA.name }}</span>
                  </div>
                  <div v-if="showRelationADropdown && filteredRelationPersonsA.length > 0" class="relation-dropdown-menu">
                    <div 
                      v-for="person in filteredRelationPersonsA" 
                      :key="person.id"
                      class="dropdown-person-item"
                      @click="selectRelationPersonA(person)"
                    >
                      <span class="person-avatar" :class="{ male: person.gender === 'M', female: person.gender === 'F' }">
                        {{ person.name.charAt(0) }}
                      </span>
                      <span class="person-name">{{ person.name }}</span>
                    </div>
                  </div>
                </div>
                
                <!-- 人物B选择 -->
                <div class="relation-select-group">
                  <label>人物 B</label>
                  <div class="relation-input-box">
                    <input 
                      v-model="relationPersonBSearch"
                      type="text"
                      placeholder="输入姓名或拼音首字母..."
                      class="relation-input"
                      @input="onRelationBInput"
                      @focus="showRelationBDropdown = true"
                    />
                    <button v-if="relationPersonB" class="clear-input-btn" @click="clearRelationB">✕</button>
                    <button class="pick-tree-btn" @click="startRelationSelect('B')" title="从族谱中选择">选</button>
                  </div>
                  <div v-if="relationPersonB" class="selected-person-tag">
                    <span class="tag-avatar" :class="{ male: relationPersonB.gender === 'M', female: relationPersonB.gender === 'F' }">
                      {{ relationPersonB.name.charAt(0) }}
                    </span>
                    <span class="tag-name">{{ relationPersonB.name }}</span>
                  </div>
                  <div v-if="showRelationBDropdown && filteredRelationPersonsB.length > 0" class="relation-dropdown-menu">
                    <div 
                      v-for="person in filteredRelationPersonsB" 
                      :key="person.id"
                      class="dropdown-person-item"
                      @click="selectRelationPersonB(person)"
                    >
                      <span class="person-avatar" :class="{ male: person.gender === 'M', female: person.gender === 'F' }">
                        {{ person.name.charAt(0) }}
                      </span>
                      <span class="person-name">{{ person.name }}</span>
                    </div>
                  </div>
                </div>
                
                <!-- 查询按钮 -->
                <button class="relation-query-btn" @click="queryRelation" :disabled="!relationPersonA || !relationPersonB">
                  查询关系
                </button>
                
                <!-- 查询结果 -->
                <div v-if="relationResult" class="relation-result-box">
                  <div class="result-text">
                    <span class="result-name">{{ relationPersonA?.name }}</span>
                    <span class="result-connector">是</span>
                    <span class="result-name">{{ relationPersonB?.name }}</span>
                    <span class="result-connector">的</span>
                  </div>
                  <div class="result-relation">{{ relationResult }}</div>
                </div>
              </div>
            </div>
            
            <div class="menu-item" @click="showMenu = false; openManagePanel()" v-if="isAdmin">
              <span>人员管理</span>
            </div>
            <div class="menu-item" @click="handleLogout">
              <span>退出登录</span>
            </div>
          </div>
          <div class="menu-footer">
            <p>当前用户：{{ currentUser?.real_name || currentUser?.username }}</p>
            <p>{{ isAdmin ? '管理员' : '普通用户' }}</p>
          </div>
        </div>
      </div>

      <header class="header">
        <div class="header-left">
          <button class="menu-btn" @click="showMenu = true">☰</button>
          <h1>族谱查询系统</h1>
          <span class="user-info">
            {{ isAdmin ? '管理员' : (currentUser?.real_name || '用户') }} 
            <button class="logout-btn" @click="handleLogout">退出</button>
          </span>
        </div>
        <div class="header-right">
          <div class="zoom-controls">
            <button @click="zoomIn" class="zoom-btn">+</button>
            <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
            <button @click="zoomOut" class="zoom-btn">-</button>
            <button @click="resetView" class="zoom-btn reset-btn">重置</button>
          </div>
          <div class="search-box">
            <input
              v-model="searchName"
              type="text"
              placeholder="输入姓名或拼音..."
              @input="onSearchInput"
              @keyup.enter="handleSearch"
              @focus="onSearchFocus"
              class="search-input"
            />
            <button @click="handleSearch" class="search-btn">🔍</button>
            <!-- 搜索下拉框 -->
            <div v-if="showSearchDropdown && searchSuggestions.length > 0" class="search-dropdown">
              <div 
                v-for="person in searchSuggestions" 
                :key="person.id"
                class="search-dropdown-item"
                @click="selectSearchSuggestion(person)"
              >
                <span class="suggestion-avatar" :class="{ male: person.gender === 'M', female: person.gender === 'F' }">
                  {{ person.name.charAt(0) }}
                </span>
                <span class="suggestion-name">{{ person.name }}</span>
              </div>
            </div>
          </div>
          <!-- 管理员功能按钮 -->
          <button v-if="isAdmin" class="admin-btn" @click="openManagePanel">
            ⚙️ 管理
          </button>
        </div>
      </header>

      <main class="main-content" ref="mainRef"
            @mousedown="startPan"
            @mousemove="onPan"
            @mouseup="endPan"
            @mouseleave="endPan"
            @wheel="onWheel"
            @click="closeAllDropdowns">
        <!-- 关系选择模式提示条 -->
        <div v-if="relationSelectMode" class="tree-select-hint">
          <span class="hint-text">点击族谱中的人物卡片选择 <strong>{{ relationSelectMode === 'A' ? '人物 A' : '人物 B' }}</strong></span>
          <button class="hint-cancel-btn" @click="cancelRelationSelect(); showMenu = true">取消</button>
        </div>
        <svg ref="svgRef" class="family-tree-svg" :style="svgStyle">
          <g ref="contentRef" :transform="`translate(${panX}, ${panY}) scale(${scale})`">
          </g>
        </svg>
      </main>

      <!-- 搜索结果选择弹窗 -->
      <div v-if="showSearchModal" class="search-modal-overlay" @click.self="showSearchModal = false">
        <div class="search-modal">
          <div class="search-modal-header">
            <div class="search-modal-icon">🔍</div>
            <h3>找到 {{ searchResults.length }} 位相关人物</h3>
            <p class="search-modal-hint">请选择要查找的人物</p>
          </div>
          <div class="search-modal-body">
            <div class="search-results-list">
              <div 
                v-for="person in searchResults" 
                :key="person.id" 
                class="search-result-item"
                @click="selectSearchResult(person)"
              >
                <div class="result-avatar" :class="{ male: person.gender === 'M', female: person.gender === 'F' }">
                  {{ person.name.charAt(0) }}
                </div>
                <div class="result-info">
                  <span class="result-name">{{ person.name }}</span>
                  <span class="result-meta">
                    {{ person.gender === 'M' ? '男' : '女' }}
                    <span v-if="person.birth_date"> · {{ person.birth_date.split('-')[0] }}年生</span>
                  </span>
                </div>
                <div class="result-arrow">→</div>
              </div>
            </div>
          </div>
          <div class="search-modal-footer">
            <button class="modal-cancel-btn" @click="showSearchModal = false">取消</button>
          </div>
        </div>
      </div>

      <!-- 确认选择弹窗 -->
      <div v-if="showConfirmModal" class="confirm-modal-overlay">
        <div class="confirm-modal">
          <div class="confirm-modal-icon">📍</div>
          <h3>确定选择</h3>
          <div class="confirm-person-card">
            <div class="confirm-avatar" :class="{ male: selectedSearchPerson?.gender === 'M', female: selectedSearchPerson?.gender === 'F' }">
              {{ selectedSearchPerson?.name?.charAt(0) }}
            </div>
            <div class="confirm-info">
              <span class="confirm-name">{{ selectedSearchPerson?.name }}</span>
              <span class="confirm-meta">{{ selectedSearchPerson?.gender === 'M' ? '男' : '女' }}</span>
            </div>
          </div>
          <p class="confirm-text">确定要定位到 <strong>{{ selectedSearchPerson?.name }}</strong> 吗？</p>
          <div class="confirm-actions">
            <button class="confirm-cancel-btn" @click="cancelSearchSelection">取消</button>
            <button class="confirm-ok-btn" @click="confirmSearchSelection">确定</button>
          </div>
        </div>
      </div>

      <!-- 个人详情弹窗 -->
      <div v-if="showPersonDetail" class="person-detail-panel resizable-panel" :class="{ 'position-right': detailPosition === 'right', 'position-left': detailPosition === 'left' }" :style="{ width: detailPanelWidth + 'px' }">
        <div class="resize-handle" :class="{ 'handle-left': detailPosition === 'right', 'handle-right': detailPosition === 'left' }" @mousedown="startResizeDetail"></div>
        <div class="detail-header">
          <button class="position-toggle-btn" @click="toggleDetailPosition" :title="detailPosition === 'right' ? '移到左侧' : '移到右侧'">
            {{ detailPosition === 'right' ? '◀' : '▶' }}
          </button>
          <h3>个人详情</h3>
          <button class="close-btn" @click="showPersonDetail = false">✕</button>
        </div>
        <div class="detail-content">
          <!-- 照片区域 -->
          <div class="photo-section">
            <!-- 图片显示区域 - 点击查看大图 -->
            <div class="photo-display" @click="openImageViewer">
              <img v-if="selectedPerson?.avatar" :src="selectedPerson.avatar" alt="照片" class="person-photo" />
              <div v-else class="photo-placeholder" :class="{ male: selectedPerson?.gender === 'M', female: selectedPerson?.gender === 'F' }">
                <span class="placeholder-text">{{ selectedPerson?.name?.charAt(0) }}</span>
                <span class="no-photo-text">暂无照片</span>
              </div>
              <div v-if="selectedPerson?.avatar" class="photo-view-hint">
                <span>🔍 点击查看大图</span>
              </div>
            </div>
            <!-- 上传按钮区域 -->
            <div v-if="selectedPerson?.can_edit" class="photo-upload-btn" @click="triggerPhotoUpload">
              <span>📷 点击上传照片</span>
            </div>
            <input type="file" ref="avatarInput" accept="image/*" style="display: none" @change="handleAvatarUpload" />
          </div>
          
          <!-- 姓名、性别和年龄 -->
          <div class="name-section">
            <h2 class="person-name">{{ selectedPerson?.name }}</h2>
            <div class="person-meta">
              <span class="person-gender-tag">{{ selectedPerson?.gender === 'M' ? '男' : '女' }}</span>
              <span class="person-age-tag" v-if="selectedPerson?.age">{{ selectedPerson.age }}岁</span>
            </div>
          </div>
          
          <!-- 已故状态提示 -->
          <div v-if="!selectedPerson?.is_alive" class="deceased-notice">
            <span class="deceased-icon">🕊️</span>
            <span class="deceased-text">羽化登仙</span>
            <span class="deceased-date" v-if="selectedPerson?.death_date">{{ selectedPerson.death_date }}</span>
          </div>
          
          <!-- 基本信息 -->
          <div class="info-section">
            <div class="info-item">
              <label>出生日期</label>
              <div class="date-display">
                <span>{{ displayBirthDate }}</span>
                <button class="calendar-toggle" @click="toggleCalendarType" title="切换阳历/农历">
                  {{ calendarType === 'solar' ? '🌞' : '🌙' }}
                </button>
              </div>
            </div>
            
            <!-- 职业（可编辑） -->
            <div class="info-item editable-info">
              <label>职业</label>
              <div v-if="!editingOccupation" class="info-value-wrap">
                <span>{{ selectedPerson?.occupation || '未填写' }}</span>
                <button v-if="selectedPerson?.can_edit" class="inline-edit-btn" @click="startEditOccupation">✏️</button>
              </div>
              <div v-else class="inline-edit-area">
                <input v-model="editOccupationValue" type="text" placeholder="输入职业..." />
                <button class="inline-save-btn" @click="saveOccupation">✓</button>
                <button class="inline-cancel-btn" @click="editingOccupation = false">✕</button>
              </div>
            </div>
            
            <!-- 地址（可编辑） -->
            <div class="info-item editable-info">
              <label>地址</label>
              <div v-if="!editingAddress" class="info-value-wrap">
                <span>{{ selectedPerson?.address || '未填写' }}</span>
                <button v-if="selectedPerson?.can_edit" class="inline-edit-btn" @click="startEditAddress">✏️</button>
              </div>
              <div v-else class="inline-edit-area">
                <input v-model="editAddressValue" type="text" placeholder="输入地址..." />
                <button class="inline-save-btn" @click="saveAddress">✓</button>
                <button class="inline-cancel-btn" @click="editingAddress = false">✕</button>
              </div>
            </div>
          </div>

          <!-- 个人名言 -->
          <div class="editable-section">
            <div class="section-header">
              <label>💬 个人名言</label>
              <button v-if="selectedPerson?.can_edit" class="edit-btn" @click="startEditMotto">编辑</button>
            </div>
            <div v-if="!editingMotto" class="section-content">
              {{ selectedPerson?.motto || '暂无名言' }}
            </div>
            <div v-else class="edit-area">
              <textarea v-model="editMottoValue" rows="3" placeholder="输入个人名言..."></textarea>
              <div class="edit-actions">
                <button class="save-btn" @click="saveMotto">保存</button>
                <button class="cancel-btn" @click="editingMotto = false">取消</button>
              </div>
            </div>
          </div>

          <!-- 个人成就 -->
          <div class="editable-section">
            <div class="section-header">
              <label>🏆 个人成就</label>
              <button v-if="selectedPerson?.can_edit" class="edit-btn" @click="startEditAchievements">编辑</button>
            </div>
            <div v-if="!editingAchievements" class="section-content">
              {{ selectedPerson?.achievements || '暂无成就记录' }}
            </div>
            <div v-else class="edit-area">
              <textarea v-model="editAchievementsValue" rows="4" placeholder="输入个人成就..."></textarea>
              <div class="edit-actions">
                <button class="save-btn" @click="saveAchievements">保存</button>
                <button class="cancel-btn" @click="editingAchievements = false">取消</button>
              </div>
            </div>
          </div>

          <!-- 生平简介 -->
          <div class="editable-section">
            <div class="section-header">
              <label>📖 生平简介</label>
              <button v-if="selectedPerson?.can_edit" class="edit-btn" @click="startEditBiography">编辑</button>
            </div>
            <div v-if="!editingBiography" class="section-content">
              {{ selectedPerson?.biography || '暂无简介' }}
            </div>
            <div v-else class="edit-area">
              <textarea v-model="editBiographyValue" rows="5" placeholder="输入生平简介..."></textarea>
              <div class="edit-actions">
                <button class="save-btn" @click="saveBiography">保存</button>
                <button class="cancel-btn" @click="editingBiography = false">取消</button>
              </div>
            </div>
          </div>

          <!-- 管理员操作区域 -->
          <div v-if="isAdmin" class="admin-section">
            <div class="admin-section-header">
              <span class="admin-badge">👑 管理员操作</span>
            </div>
            
            <!-- 修改父母关系 -->
            <div class="parent-edit-section">
              <div class="parent-edit-item">
                <label>父亲</label>
                <div class="parent-search-box">
                  <input 
                    v-model="fatherSearchText"
                    type="text"
                    placeholder="输入姓名搜索..."
                    class="parent-search-input"
                    @focus="showFatherDropdown = true"
                    @input="showFatherDropdown = true"
                  />
                  <button v-if="editFatherId" class="clear-parent-btn" @click="clearFather">✕</button>
                  <div v-if="showFatherDropdown" class="parent-dropdown">
                    <div class="parent-dropdown-item none-option" @click="selectFather(null)">
                      <span>无</span>
                    </div>
                    <div 
                      v-for="person in filteredFathers" 
                      :key="person.id"
                      class="parent-dropdown-item"
                      :class="{ selected: editFatherId === person.id }"
                      @click="selectFather(person)"
                    >
                      <span class="parent-item-name">{{ person.name }}</span>
                      <span class="parent-item-hint">{{ person.birth_date ? person.birth_date.split('-')[0] + '年生' : '' }}</span>
                    </div>
                    <div v-if="filteredFathers.length === 0" class="parent-dropdown-empty">
                      无匹配结果
                    </div>
                  </div>
                </div>
              </div>
              <div class="parent-edit-item">
                <label>母亲</label>
                <div class="parent-search-box">
                  <input 
                    v-model="motherSearchText"
                    type="text"
                    placeholder="输入姓名搜索..."
                    class="parent-search-input"
                    @focus="showMotherDropdown = true"
                    @input="showMotherDropdown = true"
                  />
                  <button v-if="editMotherId" class="clear-parent-btn" @click="clearMother">✕</button>
                  <div v-if="showMotherDropdown" class="parent-dropdown">
                    <div class="parent-dropdown-item none-option" @click="selectMother(null)">
                      <span>无</span>
                    </div>
                    <div 
                      v-for="person in filteredMothers" 
                      :key="person.id"
                      class="parent-dropdown-item"
                      :class="{ selected: editMotherId === person.id }"
                      @click="selectMother(person)"
                    >
                      <span class="parent-item-name">{{ person.name }}</span>
                      <span class="parent-item-hint">{{ person.birth_date ? person.birth_date.split('-')[0] + '年生' : '' }}</span>
                    </div>
                    <div v-if="filteredMothers.length === 0" class="parent-dropdown-empty">
                      无匹配结果
                    </div>
                  </div>
                </div>
              </div>
              <button class="save-parent-btn" @click="saveParentRelation">
                💾 保存父母关系
              </button>
            </div>

            <!-- 删除人物 -->
            <div class="danger-zone">
              <button class="delete-person-btn" @click="showDeleteConfirm = true">
                🗑️ 删除此人物
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 删除确认弹窗 -->
      <div v-if="showDeleteConfirm" class="delete-confirm-overlay">
        <div class="delete-confirm-modal">
          <div class="delete-confirm-icon">⚠️</div>
          <h3>确认删除</h3>
          <p class="delete-warning">您确定要删除 <strong>{{ selectedPerson?.name }}</strong> 吗？</p>
          <p class="delete-hint">此操作不可撤销，该人物的所有信息将被永久删除。</p>
          <div class="delete-confirm-actions">
            <button class="delete-cancel-btn" @click="showDeleteConfirm = false">取消</button>
            <button class="delete-confirm-btn" @click="confirmDeletePerson">确认删除</button>
          </div>
        </div>
      </div>

      <!-- 图片裁切弹窗 -->
      <div v-if="showCropModal" class="crop-modal-overlay" @click.self="cancelCrop">
        <div class="crop-modal" ref="cropperRef">
          <div class="crop-modal-header">
            <h3>✂️ 裁切头像</h3>
            <button class="close-btn" @click="cancelCrop">✕</button>
          </div>
          <div class="crop-modal-body">
            <div class="crop-image-container" 
                 @mousemove="onCropMove" 
                 @mouseup="endCropDrag" 
                 @mouseleave="endCropDrag">
              <img :src="cropImageSrc" @load="onCropImageLoad" class="crop-preview-image" />
              <div class="crop-overlay">
                <div class="crop-area" 
                     :style="{ 
                       left: cropArea.x + 'px', 
                       top: cropArea.y + 'px', 
                       width: cropArea.size + 'px', 
                       height: cropArea.size + 'px' 
                     }"
                     @mousedown="startCropDrag">
                  <div class="crop-resize-handle" @mousedown="startCropResize"></div>
                </div>
              </div>
            </div>
            <p class="crop-hint">拖动方框调整位置，拖动右下角调整大小</p>
          </div>
          <div class="crop-modal-footer">
            <button class="crop-skip-btn" @click="uploadWithoutCrop">跳过裁切，直接上传</button>
            <div class="crop-actions">
              <button class="crop-cancel-btn" @click="cancelCrop">取消</button>
              <button class="crop-confirm-btn" @click="confirmCrop">确认裁切</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 图片查看器弹窗 -->
      <div v-if="showImageViewer" class="image-viewer-overlay" @click.self="closeImageViewer">
        <div class="image-viewer-container">
          <div class="image-viewer-header">
            <span class="viewer-title">{{ selectedPerson?.name }} 的照片</span>
            <div class="viewer-controls">
              <button class="viewer-btn" @click="zoomImageIn" title="放大">➕</button>
              <span class="viewer-zoom-level">{{ Math.round(imageViewerScale * 100) }}%</span>
              <button class="viewer-btn" @click="zoomImageOut" title="缩小">➖</button>
              <button class="viewer-btn" @click="resetImageZoom" title="重置">🔄</button>
              <button class="viewer-close-btn" @click="closeImageViewer">✕</button>
            </div>
          </div>
          <div class="image-viewer-body" 
               @wheel="onImageViewerWheel"
               @mousedown="startImageDrag"
               @mousemove="onImageDrag"
               @mouseup="endImageDrag"
               @mouseleave="endImageDrag">
            <img 
              :src="selectedPerson?.avatar" 
              :style="{ 
                transform: `translate(${imageViewerPan.x}px, ${imageViewerPan.y}px) scale(${imageViewerScale})`,
                cursor: isDraggingImage ? 'grabbing' : 'grab'
              }"
              class="viewer-image"
              @dragstart.prevent
            />
          </div>
          <div class="image-viewer-footer">
            <span class="viewer-hint">滚轮缩放 · 拖动移动 · 点击外部关闭</span>
          </div>
        </div>
      </div>

      <!-- 关系查询弹窗 -->
      <div v-if="showRelationQuery" class="relation-query-overlay" @click.self="showRelationQuery = false">
        <div class="relation-query-modal">
          <div class="relation-query-header">
            <h3>🔗 关系查询</h3>
            <button class="close-btn" @click="showRelationQuery = false">✕</button>
          </div>
          <div class="relation-query-body">
            <!-- 提示信息 -->
            <div v-if="relationSelectMode" class="relation-select-hint">
              <span class="hint-icon">👆</span>
              <span>请在族谱中点击选择 <strong>{{ relationSelectMode === 'A' ? '人物 A' : '人物 B' }}</strong></span>
              <button class="cancel-select-btn" @click="cancelRelationSelect">取消</button>
            </div>
            
            <div class="relation-select-row">
              <div class="relation-select-item">
                <div class="relation-item-header">
                  <label>人物 A</label>
                  <button class="pick-from-tree-btn" @click="startRelationSelect('A')" :disabled="relationSelectMode !== null">
                    🎯 在族谱中选择
                  </button>
                </div>
                <div class="relation-search-box">
                  <input 
                    v-model="relationPersonASearch"
                    type="text"
                    placeholder="输入姓名搜索..."
                    class="relation-search-input"
                    @focus="showRelationADropdown = true"
                    @input="showRelationADropdown = true"
                  />
                  <div v-if="showRelationADropdown && filteredRelationPersonsA.length > 0" class="relation-dropdown">
                    <div 
                      v-for="person in filteredRelationPersonsA" 
                      :key="person.id"
                      class="relation-dropdown-item"
                      @click="selectRelationPersonA(person)"
                    >
                      <span class="relation-item-avatar" :class="{ male: person.gender === 'M', female: person.gender === 'F' }">
                        {{ person.name.charAt(0) }}
                      </span>
                      <span class="relation-item-name">{{ person.name }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="relationPersonA" class="selected-person-card">
                  <span class="selected-avatar" :class="{ male: relationPersonA.gender === 'M', female: relationPersonA.gender === 'F' }">
                    {{ relationPersonA.name.charAt(0) }}
                  </span>
                  <span class="selected-name">{{ relationPersonA.name }}</span>
                  <button class="clear-selected" @click="relationPersonA = null; relationPersonASearch = ''">✕</button>
                </div>
              </div>
              
              <div class="relation-arrow">→</div>
              
              <div class="relation-select-item">
                <div class="relation-item-header">
                  <label>人物 B</label>
                  <button class="pick-from-tree-btn" @click="startRelationSelect('B')" :disabled="relationSelectMode !== null">
                    🎯 在族谱中选择
                  </button>
                </div>
                <div class="relation-search-box">
                  <input 
                    v-model="relationPersonBSearch"
                    type="text"
                    placeholder="输入姓名搜索..."
                    class="relation-search-input"
                    @focus="showRelationBDropdown = true"
                    @input="showRelationBDropdown = true"
                  />
                  <div v-if="showRelationBDropdown && filteredRelationPersonsB.length > 0" class="relation-dropdown">
                    <div 
                      v-for="person in filteredRelationPersonsB" 
                      :key="person.id"
                      class="relation-dropdown-item"
                      @click="selectRelationPersonB(person)"
                    >
                      <span class="relation-item-avatar" :class="{ male: person.gender === 'M', female: person.gender === 'F' }">
                        {{ person.name.charAt(0) }}
                      </span>
                      <span class="relation-item-name">{{ person.name }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="relationPersonB" class="selected-person-card">
                  <span class="selected-avatar" :class="{ male: relationPersonB.gender === 'M', female: relationPersonB.gender === 'F' }">
                    {{ relationPersonB.name.charAt(0) }}
                  </span>
                  <span class="selected-name">{{ relationPersonB.name }}</span>
                  <button class="clear-selected" @click="relationPersonB = null; relationPersonBSearch = ''">✕</button>
                </div>
              </div>
            </div>
            
            <button class="query-relation-btn" @click="queryRelation" :disabled="!relationPersonA || !relationPersonB">
              🔍 查询关系
            </button>
            
            <div v-if="relationResult" class="relation-result">
              <div class="relation-result-card">
                <div class="result-persons">
                  <span class="result-person-name">{{ relationPersonA?.name }}</span>
                  <span class="result-relation-text">是</span>
                  <span class="result-person-name">{{ relationPersonB?.name }}</span>
                  <span class="result-relation-text">的</span>
                </div>
                <div class="result-relation-name">{{ relationResult }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 管理面板（侧边栏） -->
      <div v-if="showManagePanel && isAdmin" class="manage-sidebar resizable-panel" :style="{ width: managePanelWidth + 'px' }">
        <div class="resize-handle handle-left" @mousedown="startResizeManage"></div>
        <div class="panel-header">
          <h2>人员管理</h2>
          <button class="close-btn" @click="showManagePanel = false">✕</button>
        </div>
        
        <div class="panel-tabs">
          <button :class="{ active: activeTab === 'add' }" @click="activeTab = 'add'">添加人员</button>
          <button :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'; loadPersonList()">人员列表</button>
        </div>

        <!-- 添加人员表单 -->
        <div v-if="activeTab === 'add'" class="panel-content">
          <div class="form-row">
            <div class="form-group">
              <label>姓名 *</label>
              <input v-model="personForm.name" type="text" placeholder="请输入姓名" />
            </div>
            <div class="form-group">
              <label>性别 *</label>
              <select v-model="personForm.gender">
                <option value="M">男</option>
                <option value="F">女</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>出生日期</label>
              <input v-model="personForm.birth_date" type="date" />
            </div>
            <div class="form-group">
              <label>是否健在</label>
              <select v-model="personForm.is_alive">
                <option :value="true">是</option>
                <option :value="false">否</option>
              </select>
            </div>
          </div>
          
          <!-- 关系定位方式选择 -->
          <div class="form-group full-width">
            <label>关系定位方式</label>
            <select v-model="relationMode" class="relation-mode-select">
              <option value="parent">设置父母（此人是XX的孩子）</option>
              <option value="child">设置为某人的孩子（XX是此人的父/母）</option>
              <option value="spouse">设置为某人的配偶</option>
            </select>
          </div>
          
          <!-- 父母模式 -->
          <div v-if="relationMode === 'parent'" class="form-row">
            <div class="form-group">
              <label>父亲</label>
              <div class="parent-search-box">
                <input 
                  v-model="formFatherSearchText"
                  type="text"
                  placeholder="输入姓名搜索..."
                  class="parent-search-input"
                  @focus="showFormFatherDropdown = true"
                  @input="showFormFatherDropdown = true"
                />
                <button v-if="personForm.father_id" class="clear-parent-btn" @click="clearFormFather">✕</button>
                <div v-if="showFormFatherDropdown" class="parent-dropdown">
                  <div class="parent-dropdown-item none-option" @click="selectFormFather(null)">
                    <span>无</span>
                  </div>
                  <div 
                    v-for="person in filteredFormFathers" 
                    :key="person.id"
                    class="parent-dropdown-item"
                    :class="{ selected: personForm.father_id === person.id }"
                    @click="selectFormFather(person)"
                  >
                    <span class="parent-item-name">{{ person.name }}</span>
                    <span class="parent-item-hint">ID: {{ person.id }}</span>
                  </div>
                  <div v-if="filteredFormFathers.length === 0" class="parent-dropdown-empty">
                    无匹配结果
                  </div>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>母亲</label>
              <div class="parent-search-box">
                <input 
                  v-model="formMotherSearchText"
                  type="text"
                  placeholder="输入姓名搜索..."
                  class="parent-search-input"
                  @focus="showFormMotherDropdown = true"
                  @input="showFormMotherDropdown = true"
                />
                <button v-if="personForm.mother_id" class="clear-parent-btn" @click="clearFormMother">✕</button>
                <div v-if="showFormMotherDropdown" class="parent-dropdown">
                  <div class="parent-dropdown-item none-option" @click="selectFormMother(null)">
                    <span>无</span>
                  </div>
                  <div 
                    v-for="person in filteredFormMothers" 
                    :key="person.id"
                    class="parent-dropdown-item"
                    :class="{ selected: personForm.mother_id === person.id }"
                    @click="selectFormMother(person)"
                  >
                    <span class="parent-item-name">{{ person.name }}</span>
                    <span class="parent-item-hint">ID: {{ person.id }}</span>
                  </div>
                  <div v-if="filteredFormMothers.length === 0" class="parent-dropdown-empty">
                    无匹配结果
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 孩子模式：此人是某人的父/母 -->
          <div v-if="relationMode === 'child'" class="form-group full-width">
            <label>此人是谁的父/母？（新人将成为所选人的孩子的父/母）</label>
            <div class="parent-search-box">
              <input 
                v-model="childOfSearchText"
                type="text"
                placeholder="输入姓名搜索..."
                class="parent-search-input"
                @focus="showChildOfDropdown = true"
                @input="showChildOfDropdown = true"
              />
              <button v-if="childOfPerson" class="clear-parent-btn" @click="childOfPerson = null; childOfSearchText = ''">✕</button>
              <div v-if="showChildOfDropdown" class="parent-dropdown">
                <div 
                  v-for="person in filteredChildOf" 
                  :key="person.id"
                  class="parent-dropdown-item"
                  @click="selectChildOf(person)"
                >
                  <span class="parent-item-name">{{ person.name }}</span>
                  <span class="parent-item-hint">{{ person.gender === 'M' ? '男' : '女' }}</span>
                </div>
                <div v-if="filteredChildOf.length === 0" class="parent-dropdown-empty">
                  无匹配结果
                </div>
              </div>
            </div>
            <div v-if="childOfPerson" class="relation-hint">
              新添加的人将成为 <strong>{{ childOfPerson.name }}</strong> 的{{ personForm.gender === 'M' ? '丈夫' : '妻子' }}，共同作为其子女的父母
            </div>
          </div>
          
          <!-- 配偶模式 -->
          <div v-if="relationMode === 'spouse'" class="form-group full-width">
            <label>配偶（此人是谁的配偶）</label>
            <div class="parent-search-box">
              <input 
                v-model="spouseSearchText"
                type="text"
                placeholder="输入姓名搜索..."
                class="parent-search-input"
                @focus="showSpouseDropdown = true"
                @input="showSpouseDropdown = true"
              />
              <button v-if="spousePerson" class="clear-parent-btn" @click="spousePerson = null; spouseSearchText = ''">✕</button>
              <div v-if="showSpouseDropdown" class="parent-dropdown">
                <div 
                  v-for="person in filteredSpouses" 
                  :key="person.id"
                  class="parent-dropdown-item"
                  @click="selectSpouse(person)"
                >
                  <span class="parent-item-name">{{ person.name }}</span>
                  <span class="parent-item-hint">{{ person.gender === 'M' ? '男' : '女' }}</span>
                </div>
                <div v-if="filteredSpouses.length === 0" class="parent-dropdown-empty">
                  无匹配结果
                </div>
              </div>
            </div>
            <div v-if="spousePerson" class="relation-hint">
              新添加的人将成为 <strong>{{ spousePerson.name }}</strong> 的{{ personForm.gender === 'M' ? '丈夫' : '妻子' }}
            </div>
          </div>
          
          <div class="form-group full-width">
            <label>生平简介</label>
            <textarea v-model="personForm.biography" rows="3" placeholder="请输入生平简介"></textarea>
          </div>
          <div class="form-actions">
            <button class="btn-primary" @click="savePerson">
              {{ editingPersonId ? '更新' : '添加' }}
            </button>
            <button v-if="editingPersonId" class="btn-secondary" @click="cancelEdit">取消编辑</button>
          </div>
        </div>

        <!-- 人员列表 -->
        <div v-if="activeTab === 'list'" class="panel-content">
          <div class="person-list">
            <div v-for="person in personList" :key="person.id" class="person-item">
              <div class="person-info">
                <span class="person-name">{{ person.name }}</span>
                <span class="person-id">ID: {{ person.id }}</span>
                <span class="person-gender">{{ person.gender === 'M' ? '男' : '女' }}</span>
              </div>
              <div class="person-actions">
                <button class="btn-edit" @click="editPerson(person)">编辑</button>
                <button class="btn-delete" @click="deletePerson(person.id)">删除</button>
              </div>
            </div>
            <div v-if="personList.length === 0" class="empty-list">
              暂无人员数据
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { searchPersons, getFamilyTree, getPersons, createPerson, updatePerson, deletePerson as apiDeletePerson, login, register, getPersonDetail, updatePersonProfile, uploadAvatar } from './api/genealogy'

// 登录状态
const isLoggedIn = ref(false)
const isAdmin = ref(false)
const isRegisterMode = ref(false)
const currentUser = ref(null)
const showPassword = ref(false)
const rememberPassword = ref(false)

const loginForm = ref({
  username: '',
  password: ''
})

const registerForm = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  real_name: ''
})

// 菜单
const showMenu = ref(false)
const detailPosition = ref('right')  // 'left' 或 'right'
const menuWidth = ref(280)
const detailPanelWidth = ref(360)
const isResizingMenu = ref(false)
const isResizingDetail = ref(false)

// 人物详情弹窗
const showPersonDetail = ref(false)
const selectedPerson = ref(null)
const editingMotto = ref(false)
const editingAchievements = ref(false)
const editingBiography = ref(false)
const editingOccupation = ref(false)
const editingAddress = ref(false)
const editMottoValue = ref('')
const editAchievementsValue = ref('')
const editBiographyValue = ref('')
const editOccupationValue = ref('')
const editAddressValue = ref('')
const avatarInput = ref(null)
const calendarType = ref('solar')  // 'solar' 阳历 或 'lunar' 农历

// 搜索弹窗
const showSearchModal = ref(false)
const searchResults = ref([])
const selectedSearchPerson = ref(null)
const showConfirmModal = ref(false)

// 管理员编辑父母关系
const editFatherId = ref(null)
const editMotherId = ref(null)
const showDeleteConfirm = ref(false)

// 图片裁切
const showCropModal = ref(false)
const cropImageSrc = ref('')
const originalImageFile = ref(null)
const cropperRef = ref(null)
const cropArea = ref({ x: 0, y: 0, size: 200 })
const isDraggingCrop = ref(false)
const isResizingCrop = ref(false)
const cropDragStart = ref({ x: 0, y: 0 })
const imageSize = ref({ width: 0, height: 0 })

// 图片查看器
const showImageViewer = ref(false)
const imageViewerScale = ref(1)
const imageViewerPan = ref({ x: 0, y: 0 })
const isDraggingImage = ref(false)
const imageDragStart = ref({ x: 0, y: 0 })

// 关系查询
const showRelationQuery = ref(false)
const relationPersonA = ref(null)
const relationPersonB = ref(null)
const relationPersonASearch = ref('')
const relationPersonBSearch = ref('')
const showRelationADropdown = ref(false)
const showRelationBDropdown = ref(false)
const relationResult = ref('')
const relationSelectMode = ref(null) // 'A' 或 'B'，表示正在从族谱中选择哪个人物
const showRelationSubMenu = ref(false) // 关系查询子菜单展开状态

// 搜索下拉框
const showSearchDropdown = ref(false)
const searchSuggestions = ref([])

// 管理面板
const showManagePanel = ref(false)
const activeTab = ref('add')
const personList = ref([])
const editingPersonId = ref(null)
const personForm = ref({
  name: '',
  gender: 'M',
  birth_date: '',
  death_date: '',
  is_alive: true,
  biography: '',
  father_id: null,
  mother_id: null
})

// 管理面板宽度调整
const managePanelWidth = ref(450)
const isResizingManage = ref(false)

// 关系定位模式
const relationMode = ref('parent') // 'parent' | 'child' | 'spouse'
const childOfSearchText = ref('')
const childOfPerson = ref(null)
const showChildOfDropdown = ref(false)
const spouseSearchText = ref('')
const spousePerson = ref(null)
const showSpouseDropdown = ref(false)

// 管理面板父母搜索
const formFatherSearchText = ref('')
const formMotherSearchText = ref('')
const showFormFatherDropdown = ref(false)
const showFormMotherDropdown = ref(false)

// 搜索和视图
const searchName = ref('')
const svgRef = ref(null)
const contentRef = ref(null)
const mainRef = ref(null)

// 缩放和平移
const scale = ref(1)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const startX = ref(0)
const startY = ref(0)

const svgStyle = computed(() => ({
  cursor: isPanning.value ? 'grabbing' : 'grab'
}))

// 登录处理
const handleLogin = async () => {
  const { username, password } = loginForm.value
  
  if (!username || !password) {
    alert('请输入账号和密码')
    return
  }
  
  try {
    const result = await login(username, password)
    if (result.success) {
      currentUser.value = result.user
      isAdmin.value = result.user.is_admin
      isLoggedIn.value = true
      
      // 记住密码
      if (rememberPassword.value) {
        localStorage.setItem('rememberedUsername', username)
        localStorage.setItem('rememberedPassword', btoa(password)) // 简单编码存储
        localStorage.setItem('rememberPassword', 'true')
      } else {
        localStorage.removeItem('rememberedUsername')
        localStorage.removeItem('rememberedPassword')
        localStorage.removeItem('rememberPassword')
      }
      
      nextTick(() => {
        setTimeout(() => loadDefaultTree(), 300)
      })
    }
  } catch (error) {
    console.error('登录失败:', error)
    alert(error.response?.data?.detail || '登录失败，请检查账号密码')
  }
}

// 加载记住的密码
const loadRememberedPassword = () => {
  const remembered = localStorage.getItem('rememberPassword')
  if (remembered === 'true') {
    const username = localStorage.getItem('rememberedUsername')
    const password = localStorage.getItem('rememberedPassword')
    if (username && password) {
      loginForm.value.username = username
      loginForm.value.password = atob(password) // 解码
      rememberPassword.value = true
    }
  }
}

// 注册处理
const handleRegister = async () => {
  const { username, email, password, confirmPassword, real_name } = registerForm.value
  
  if (!username || !email || !password || !real_name) {
    alert('请填写所有必填项')
    return
  }
  
  if (password !== confirmPassword) {
    alert('两次输入的密码不一致')
    return
  }
  
  if (password.length < 6) {
    alert('密码长度至少6位')
    return
  }
  
  try {
    const result = await register(username, password, email, real_name)
    if (result.success) {
      alert('注册申请已提交！请等待管理员审批，审批通过后会收到邮件通知。')
      isRegisterMode.value = false
      registerForm.value = { username: '', email: '', password: '', confirmPassword: '', real_name: '' }
    }
  } catch (error) {
    console.error('注册失败:', error)
    alert(error.response?.data?.detail || '注册失败')
  }
}

const handleLogout = () => {
  isLoggedIn.value = false
  isAdmin.value = false
  currentUser.value = null
  loginForm.value = { username: '', password: '' }
  showManagePanel.value = false
}

// 人员管理
const loadPersonList = async () => {
  try {
    personList.value = await getPersons(0, 100)
  } catch (error) {
    console.error('加载人员列表失败:', error)
  }
}

// 打开管理面板
const openManagePanel = async () => {
  showManagePanel.value = true
  relationMode.value = 'parent'
  spousePerson.value = null
  spouseSearchText.value = ''
  childOfPerson.value = null
  childOfSearchText.value = ''
  await loadPersonList()
}

// 面板拖拽开始
const startDragPanel = (e) => {
  if (e.target.tagName === 'BUTTON') return  // 不拖拽按钮
  isDraggingPanel.value = true
  
  const panel = managePanelRef.value
  if (panel) {
    const rect = panel.getBoundingClientRect()
    if (managePanelPos.value.x === 0 && managePanelPos.value.y === 0) {
      // 第一次拖拽，记录当前位置
      managePanelPos.value = { x: rect.left, y: rect.top }
    }
    panelDragStart.value = {
      x: e.clientX - managePanelPos.value.x,
      y: e.clientY - managePanelPos.value.y
    }
  }
  
  document.addEventListener('mousemove', onDragPanel)
  document.addEventListener('mouseup', stopDragPanel)
}

// 面板拖拽中
const onDragPanel = (e) => {
  if (!isDraggingPanel.value) return
  managePanelPos.value = {
    x: e.clientX - panelDragStart.value.x,
    y: e.clientY - panelDragStart.value.y
  }
}

// 面板拖拽结束
const stopDragPanel = () => {
  isDraggingPanel.value = false
  document.removeEventListener('mousemove', onDragPanel)
  document.removeEventListener('mouseup', stopDragPanel)
}

const resetPersonForm = () => {
  personForm.value = {
    name: '',
    gender: 'M',
    birth_date: '',
    death_date: '',
    is_alive: true,
    biography: '',
    father_id: null,
    mother_id: null
  }
  editingPersonId.value = null
  formFatherSearchText.value = ''
  formMotherSearchText.value = ''
}

const savePerson = async () => {
  if (!personForm.value.name) {
    alert('请输入姓名')
    return
  }

  try {
    const data = {
      name: personForm.value.name,
      gender: personForm.value.gender,
      birth_date: personForm.value.birth_date || null,
      death_date: personForm.value.death_date || null,
      is_alive: personForm.value.is_alive,
      biography: personForm.value.biography || null,
      father_id: null,
      mother_id: null
    }

    // 根据关系模式设置父母
    if (relationMode.value === 'parent') {
      data.father_id = personForm.value.father_id ? parseInt(personForm.value.father_id) : null
      data.mother_id = personForm.value.mother_id ? parseInt(personForm.value.mother_id) : null
    } else if (relationMode.value === 'spouse' && spousePerson.value) {
      // 配偶模式：继承配偶的父母关系（如果配偶有孩子，新人成为孩子的另一个父/母）
      // 这里只是创建人物，配偶关系通过共同的孩子体现
    } else if (relationMode.value === 'child' && childOfPerson.value) {
      // 孩子模式：新人成为某人的配偶，共同作为其子女的父母
      // 需要在创建后更新子女的父/母ID
    }

    let newPersonId = null
    const hasParent = data.father_id || data.mother_id
    
    if (editingPersonId.value) {
      await updatePerson(editingPersonId.value, data)
      newPersonId = editingPersonId.value
      alert('更新成功！')
    } else {
      const result = await createPerson(data)
      newPersonId = result.id
      
      // 配偶模式：如果配偶有孩子，更新孩子的父/母ID
      if (relationMode.value === 'spouse' && spousePerson.value) {
        const spouseChildren = personList.value.filter(p => 
          (spousePerson.value.gender === 'M' && p.father_id === spousePerson.value.id) ||
          (spousePerson.value.gender === 'F' && p.mother_id === spousePerson.value.id)
        )
        for (const child of spouseChildren) {
          const updateData = {}
          if (personForm.value.gender === 'M') {
            updateData.father_id = newPersonId
          } else {
            updateData.mother_id = newPersonId
          }
          await updatePerson(child.id, updateData)
        }
      }
      
      // 孩子模式：更新childOfPerson的所有孩子，设置新人为另一个父/母
      if (relationMode.value === 'child' && childOfPerson.value) {
        const targetChildren = personList.value.filter(p => 
          (childOfPerson.value.gender === 'M' && p.father_id === childOfPerson.value.id) ||
          (childOfPerson.value.gender === 'F' && p.mother_id === childOfPerson.value.id)
        )
        for (const child of targetChildren) {
          const updateData = {}
          if (personForm.value.gender === 'M') {
            updateData.father_id = newPersonId
          } else {
            updateData.mother_id = newPersonId
          }
          await updatePerson(child.id, updateData)
        }
      }
      
      alert('添加成功！人物已添加到族谱中')
    }

    resetPersonForm()
    await loadPersonList()
    
    // 刷新族谱：始终加载默认族谱以确保完整性
    await loadDefaultTree()
    
    // 如果新人物有父母关系，延迟后定位到它
    if ((hasParent || spousePerson.value || childOfPerson.value) && newPersonId) {
      setTimeout(() => {
        searchAnimateTo(newPersonId)
      }, 300)
    }
    
    // 重置关系选择
    spousePerson.value = null
    spouseSearchText.value = ''
    childOfPerson.value = null
    childOfSearchText.value = ''
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败: ' + (error.response?.data?.detail || error.message))
  }
}

const editPerson = async (person) => {
  editingPersonId.value = person.id
  relationMode.value = 'parent' // 编辑时默认使用父母模式
  personForm.value = {
    name: person.name,
    gender: person.gender,
    birth_date: person.birth_date || '',
    death_date: person.death_date || '',
    is_alive: person.is_alive,
    biography: person.biography || '',
    father_id: person.father_id || null,
    mother_id: person.mother_id || null
  }
  // 设置父母搜索文本
  await loadPersonList()
  const fatherPerson = personList.value.find(p => p.id === person.father_id)
  const motherPerson = personList.value.find(p => p.id === person.mother_id)
  formFatherSearchText.value = fatherPerson?.name || ''
  formMotherSearchText.value = motherPerson?.name || ''
  activeTab.value = 'add'
}

const cancelEdit = () => {
  resetPersonForm()
}

const deletePerson = async (personId) => {
  if (!confirm('确定要删除此人员吗？')) return
  
  try {
    await apiDeletePerson(personId)
    alert('删除成功！')
    await loadPersonList()
    await loadDefaultTree()
  } catch (error) {
    console.error('删除失败:', error)
    alert('删除失败: ' + (error.response?.data?.detail || error.message))
  }
}

// 缩放控制（以鼠标位置为中心）
const zoomAtPoint = (newScale, clientX, clientY) => {
  const mainEl = mainRef.value
  if (!mainEl) return
  
  // 获取容器的边界
  const rect = mainEl.getBoundingClientRect()
  
  // 鼠标相对于容器的位置
  const mouseX = clientX - rect.left
  const mouseY = clientY - rect.top
  
  // 鼠标在缩放前对应的画布坐标
  const canvasX = (mouseX - panX.value) / scale.value
  const canvasY = (mouseY - panY.value) / scale.value
  
  // 更新缩放比例
  const oldScale = scale.value
  scale.value = Math.max(0.3, Math.min(3, newScale))
  
  // 调整平移量，使鼠标位置对应的画布坐标保持不变
  panX.value = mouseX - canvasX * scale.value
  panY.value = mouseY - canvasY * scale.value
}

const zoomIn = () => {
  const mainEl = mainRef.value
  if (mainEl) {
    const rect = mainEl.getBoundingClientRect()
    zoomAtPoint(scale.value * 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2)
    updateAllNodesVisibility()
  }
}

const zoomOut = () => {
  const mainEl = mainRef.value
  if (mainEl) {
    const rect = mainEl.getBoundingClientRect()
    zoomAtPoint(scale.value / 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2)
    updateAllNodesVisibility()
  }
}

const resetView = () => { 
  scale.value = 1
  panX.value = 0
  panY.value = 0
  updateAllNodesVisibility()
}

const onWheel = (e) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  zoomAtPoint(scale.value * delta, e.clientX, e.clientY)
  // 缩放后更新节点显示模式
  updateAllNodesVisibility()
}

// 画布平移
const startPan = (e) => {
  // 如果点击的是节点，不启动画布平移
  if (e.target.closest('.node-group')) return
  isPanning.value = true
  startX.value = e.clientX - panX.value
  startY.value = e.clientY - panY.value
}
const onPan = (e) => {
  if (!isPanning.value) return
  panX.value = e.clientX - startX.value
  panY.value = e.clientY - startY.value
}
const endPan = () => { isPanning.value = false }

// 人物详情相关
const openPersonDetail = async (personId) => {
  try {
    const userId = currentUser.value?.id || null
    const detail = await getPersonDetail(personId, userId)
    selectedPerson.value = detail
    showPersonDetail.value = true
    editingMotto.value = false
    editingAchievements.value = false
    // 加载人员列表供选择父母
    await loadPersonList()
    // 初始化父母编辑值
    editFatherId.value = detail.father_id ? parseInt(detail.father_id) : null
    editMotherId.value = detail.mother_id ? parseInt(detail.mother_id) : null
    // 初始化父母搜索显示名
    const fatherPerson = personList.value.find(p => p.id === editFatherId.value)
    const motherPerson = personList.value.find(p => p.id === editMotherId.value)
    fatherSearchText.value = fatherPerson?.name || ''
    motherSearchText.value = motherPerson?.name || ''
    showDeleteConfirm.value = false
  } catch (error) {
    console.error('获取人物详情失败:', error)
    alert('获取人物详情失败')
  }
}

// 父母搜索相关
const fatherSearchText = ref('')
const motherSearchText = ref('')
const showFatherDropdown = ref(false)
const showMotherDropdown = ref(false)

// 可选的父母列表（排除自己）
const availableParents = computed(() => {
  const currentId = selectedPerson.value?.id
  const males = personList.value.filter(p => p.gender === 'M' && p.id !== currentId)
  const females = personList.value.filter(p => p.gender === 'F' && p.id !== currentId)
  return { males, females }
})

// 过滤后的父亲列表
const filteredFathers = computed(() => {
  const searchText = fatherSearchText.value.toLowerCase().trim()
  if (!searchText) return availableParents.value.males
  return availableParents.value.males.filter(p => p.name.toLowerCase().includes(searchText))
})

// 过滤后的母亲列表
const filteredMothers = computed(() => {
  const searchText = motherSearchText.value.toLowerCase().trim()
  if (!searchText) return availableParents.value.females
  return availableParents.value.females.filter(p => p.name.toLowerCase().includes(searchText))
})

// 关系查询 - 过滤人物A列表
const filteredRelationPersonsA = computed(() => {
  const searchText = relationPersonASearch.value.trim()
  if (!searchText) return sortByPinyin(personList.value).slice(0, 10)
  
  const searchLower = searchText.toLowerCase()
  const filtered = personList.value.filter(p => {
    // 匹配名字
    if (p.name.toLowerCase().includes(searchLower)) return true
    // 匹配拼音首字母
    if (matchPinyinInitials(p.name, searchText)) return true
    return false
  })
  return sortByPinyin(filtered).slice(0, 10)
})

// 关系查询 - 过滤人物B列表
const filteredRelationPersonsB = computed(() => {
  const searchText = relationPersonBSearch.value.trim()
  if (!searchText) return sortByPinyin(personList.value).slice(0, 10)
  
  const searchLower = searchText.toLowerCase()
  const filtered = personList.value.filter(p => {
    // 匹配名字
    if (p.name.toLowerCase().includes(searchLower)) return true
    // 匹配拼音首字母
    if (matchPinyinInitials(p.name, searchText)) return true
    return false
  })
  return sortByPinyin(filtered).slice(0, 10)
})

// 选择父亲
const selectFather = (person) => {
  if (person) {
    editFatherId.value = person.id
    fatherSearchText.value = person.name
  } else {
    editFatherId.value = null
    fatherSearchText.value = ''
  }
  showFatherDropdown.value = false
}

// 选择母亲
const selectMother = (person) => {
  if (person) {
    editMotherId.value = person.id
    motherSearchText.value = person.name
  } else {
    editMotherId.value = null
    motherSearchText.value = ''
  }
  showMotherDropdown.value = false
}

// 清除父亲
const clearFather = () => {
  editFatherId.value = null
  fatherSearchText.value = ''
}

// 清除母亲
const clearMother = () => {
  editMotherId.value = null
  motherSearchText.value = ''
}

// 打开关系查询
const openRelationQuery = async () => {
  showRelationQuery.value = true
  relationPersonA.value = null
  relationPersonB.value = null
  relationPersonASearch.value = ''
  relationPersonBSearch.value = ''
  relationResult.value = ''
  // 确保人员列表已加载
  if (personList.value.length === 0) {
    await loadPersonList()
  }
}

// 选择关系查询人物A
const selectRelationPersonA = (person) => {
  relationPersonA.value = person
  relationPersonASearch.value = ''
  showRelationADropdown.value = false
  relationResult.value = ''
}

// 选择关系查询人物B
const selectRelationPersonB = (person) => {
  relationPersonB.value = person
  relationPersonBSearch.value = ''
  showRelationBDropdown.value = false
  relationResult.value = ''
}

// 切换关系查询子菜单
const toggleRelationSubMenu = async () => {
  showRelationSubMenu.value = !showRelationSubMenu.value
  if (showRelationSubMenu.value) {
    // 确保人员列表已加载
    if (personList.value.length === 0) {
      await loadPersonList()
    }
    // 重置状态
    relationPersonA.value = null
    relationPersonB.value = null
    relationPersonASearch.value = ''
    relationPersonBSearch.value = ''
    relationResult.value = ''
  }
}

// 关系查询输入处理
const onRelationAInput = () => {
  showRelationADropdown.value = true
  showRelationBDropdown.value = false
}

const onRelationBInput = () => {
  showRelationBDropdown.value = true
  showRelationADropdown.value = false
}

// 清除选择
const clearRelationA = () => {
  relationPersonA.value = null
  relationPersonASearch.value = ''
  relationResult.value = ''
}

const clearRelationB = () => {
  relationPersonB.value = null
  relationPersonBSearch.value = ''
  relationResult.value = ''
}

// 搜索框输入处理
const onSearchInput = () => {
  const searchText = searchName.value.trim()
  if (searchText.length >= 1) {
    const searchLower = searchText.toLowerCase()
    const filtered = personList.value.filter(p => {
      if (p.name.toLowerCase().includes(searchLower)) return true
      if (matchPinyinInitials(p.name, searchText)) return true
      return false
    })
    searchSuggestions.value = sortByPinyin(filtered).slice(0, 8)
    showSearchDropdown.value = searchSuggestions.value.length > 0
  } else {
    searchSuggestions.value = []
    showSearchDropdown.value = false
  }
}

const onSearchFocus = () => {
  if (searchName.value.trim().length >= 1 && searchSuggestions.value.length > 0) {
    showSearchDropdown.value = true
  }
}

// 选择搜索建议
const selectSearchSuggestion = async (person) => {
  showSearchDropdown.value = false
  searchName.value = ''
  searchSuggestions.value = []
  await loadFamilyTree(person.id, true)
}

// 关闭所有下拉框
const closeAllDropdowns = (e) => {
  // 检查点击是否在下拉框或输入框内
  if (!e.target.closest('.search-box') && !e.target.closest('.relation-submenu')) {
    showSearchDropdown.value = false
    showRelationADropdown.value = false
    showRelationBDropdown.value = false
  }
}

// 开始从族谱中选择人物
const startRelationSelect = (target) => {
  relationSelectMode.value = target
  showMenu.value = false // 关闭菜单，进入选择模式
}

// 取消从族谱中选择
const cancelRelationSelect = () => {
  relationSelectMode.value = null
}

// 从族谱中选择人物完成（在点击节点时调用）
const completeRelationSelect = (person) => {
  if (relationSelectMode.value === 'A') {
    relationPersonA.value = person
    relationPersonASearch.value = ''
  } else if (relationSelectMode.value === 'B') {
    relationPersonB.value = person
    relationPersonBSearch.value = ''
  }
  relationSelectMode.value = null
  relationResult.value = ''
  showMenu.value = true // 重新显示菜单
}

// 构建家族关系图
const buildFamilyMap = () => {
  const familyMap = new Map()
  personList.value.forEach(person => {
    familyMap.set(person.id, {
      ...person,
      children: []
    })
  })
  // 建立父子关系
  personList.value.forEach(person => {
    if (person.father_id && familyMap.has(person.father_id)) {
      familyMap.get(person.father_id).children.push(person.id)
    }
    if (person.mother_id && familyMap.has(person.mother_id)) {
      familyMap.get(person.mother_id).children.push(person.id)
    }
  })
  return familyMap
}

// 获取某人的所有祖先（返回Map: 祖先ID -> 代数距离）
const getAncestors = (personId, familyMap, visited = new Set()) => {
  const ancestors = new Map()
  if (visited.has(personId)) return ancestors
  visited.add(personId)
  
  const person = familyMap.get(personId)
  if (!person) return ancestors
  
  if (person.father_id && familyMap.has(person.father_id)) {
    ancestors.set(person.father_id, 1)
    const fatherAncestors = getAncestors(person.father_id, familyMap, visited)
    fatherAncestors.forEach((dist, id) => {
      if (!ancestors.has(id) || ancestors.get(id) > dist + 1) {
        ancestors.set(id, dist + 1)
      }
    })
  }
  if (person.mother_id && familyMap.has(person.mother_id)) {
    ancestors.set(person.mother_id, 1)
    const motherAncestors = getAncestors(person.mother_id, familyMap, visited)
    motherAncestors.forEach((dist, id) => {
      if (!ancestors.has(id) || ancestors.get(id) > dist + 1) {
        ancestors.set(id, dist + 1)
      }
    })
  }
  return ancestors
}

// 获取某人的所有后代（返回Map: 后代ID -> 代数距离）
const getDescendants = (personId, familyMap, visited = new Set()) => {
  const descendants = new Map()
  if (visited.has(personId)) return descendants
  visited.add(personId)
  
  const person = familyMap.get(personId)
  if (!person) return descendants
  
  person.children.forEach(childId => {
    descendants.set(childId, 1)
    const childDescendants = getDescendants(childId, familyMap, visited)
    childDescendants.forEach((dist, id) => {
      if (!descendants.has(id) || descendants.get(id) > dist + 1) {
        descendants.set(id, dist + 1)
      }
    })
  })
  return descendants
}

// 查询关系
const queryRelation = () => {
  if (!relationPersonA.value || !relationPersonB.value) return
  
  const personA = relationPersonA.value
  const personB = relationPersonB.value
  
  if (personA.id === personB.id) {
    relationResult.value = '本人'
    return
  }
  
  const familyMap = buildFamilyMap()
  const ancestorsOfA = getAncestors(personA.id, familyMap)
  const descendantsOfA = getDescendants(personA.id, familyMap)
  const ancestorsOfB = getAncestors(personB.id, familyMap)
  
  // A是B的父母
  if (personB.father_id === personA.id) {
    relationResult.value = '父亲'
    return
  }
  if (personB.mother_id === personA.id) {
    relationResult.value = '母亲'
    return
  }
  
  // A是B的子女
  if (personA.father_id === personB.id || personA.mother_id === personB.id) {
    relationResult.value = personA.gender === 'M' ? '儿子' : '女儿'
    return
  }
  
  // A是B的祖先
  if (ancestorsOfB.has(personA.id)) {
    const dist = ancestorsOfB.get(personA.id)
    const prefix = getGenerationPrefix(dist)
    relationResult.value = prefix + (personA.gender === 'M' ? '祖父' : '祖母')
    return
  }
  
  // A是B的后代
  if (descendantsOfA.has(personB.id)) {
    const dist = descendantsOfA.get(personB.id)
    const prefix = getGenerationPrefix(dist)
    relationResult.value = prefix + (personA.gender === 'M' ? '孙子' : '孙女')
    return
  }
  
  // A是B的祖先
  if (ancestorsOfA.has(personB.id)) {
    const dist = ancestorsOfA.get(personB.id)
    const prefix = getGenerationPrefix(dist)
    relationResult.value = prefix + (personA.gender === 'M' ? '孙子' : '孙女')
    return
  }
  
  // 检查是否是兄弟姐妹
  const personAData = familyMap.get(personA.id)
  const personBData = familyMap.get(personB.id)
  if (personAData && personBData) {
    const sameParent = (personAData.father_id && personAData.father_id === personBData.father_id) ||
                       (personAData.mother_id && personAData.mother_id === personBData.mother_id)
    if (sameParent) {
      if (personA.gender === 'M') {
        relationResult.value = '兄弟'
      } else {
        relationResult.value = '姐妹'
      }
      return
    }
  }
  
  // 检查是否是配偶（有共同子女）
  const childrenOfA = familyMap.get(personA.id)?.children || []
  const childrenOfB = familyMap.get(personB.id)?.children || []
  const commonChildren = childrenOfA.filter(c => childrenOfB.includes(c))
  if (commonChildren.length > 0) {
    relationResult.value = personA.gender === 'M' ? '丈夫' : '妻子'
    return
  }
  
  // 检查是否是公婆/岳父母（A是B配偶的父母）
  // 找B的配偶
  const spouseOfB = personList.value.find(p => {
    const pChildren = familyMap.get(p.id)?.children || []
    return p.id !== personB.id && pChildren.some(c => childrenOfB.includes(c))
  })
  if (spouseOfB) {
    // A是B配偶的父母
    if (spouseOfB.father_id === personA.id || spouseOfB.mother_id === personA.id) {
      if (spouseOfB.gender === 'M') {
        // B的配偶是男性，A是B的公公或婆婆
        relationResult.value = personA.gender === 'M' ? '公公' : '婆婆'
      } else {
        // B的配偶是女性，A是B的岳父或岳母
        relationResult.value = personA.gender === 'M' ? '岳父' : '岳母'
      }
      return
    }
  }
  
  // 检查是否是儿媳/女婿（A是B子女的配偶）
  for (const childId of childrenOfB) {
    const child = familyMap.get(childId)
    if (child) {
      // 找child的配偶
      const childChildren = child.children || []
      const childSpouse = personList.value.find(p => {
        const pChildren = familyMap.get(p.id)?.children || []
        return p.id !== childId && pChildren.some(c => childChildren.includes(c))
      })
      if (childSpouse && childSpouse.id === personA.id) {
        if (child.gender === 'M') {
          // B的儿子的配偶，A是儿媳
          relationResult.value = '儿媳'
        } else {
          // B的女儿的配偶，A是女婿
          relationResult.value = '女婿'
        }
        return
      }
    }
  }
  
  // 检查是否是叔伯/姑姨（A是B父母的兄弟姐妹）
  const parentsOfB = []
  if (personBData?.father_id) parentsOfB.push(personBData.father_id)
  if (personBData?.mother_id) parentsOfB.push(personBData.mother_id)
  
  for (const parentId of parentsOfB) {
    const parent = familyMap.get(parentId)
    if (parent) {
      // 检查A是否和B的父母是兄弟姐妹
      const parentFather = parent.father_id
      const parentMother = parent.mother_id
      if ((parentFather && personAData?.father_id === parentFather) ||
          (parentMother && personAData?.mother_id === parentMother)) {
        if (parent.gender === 'M') {
          // B的父亲的兄弟姐妹
          relationResult.value = personA.gender === 'M' ? '叔伯' : '姑姑'
        } else {
          // B的母亲的兄弟姐妹
          relationResult.value = personA.gender === 'M' ? '舅舅' : '姨妈'
        }
        return
      }
    }
  }
  
  // 检查是否是侄子/侄女（A是B兄弟姐妹的子女）
  const siblingsOfB = personList.value.filter(p => {
    if (p.id === personB.id) return false
    return (p.father_id && p.father_id === personBData?.father_id) ||
           (p.mother_id && p.mother_id === personBData?.mother_id)
  })
  
  for (const sibling of siblingsOfB) {
    if (personA.father_id === sibling.id || personA.mother_id === sibling.id) {
      relationResult.value = personA.gender === 'M' ? '侄子' : '侄女'
      return
    }
  }
  
  // 检查是否是堂/表兄弟姐妹
  const grandparentsOfA = new Set()
  if (personAData?.father_id) {
    const father = familyMap.get(personAData.father_id)
    if (father?.father_id) grandparentsOfA.add(father.father_id)
    if (father?.mother_id) grandparentsOfA.add(father.mother_id)
  }
  if (personAData?.mother_id) {
    const mother = familyMap.get(personAData.mother_id)
    if (mother?.father_id) grandparentsOfA.add(mother.father_id)
    if (mother?.mother_id) grandparentsOfA.add(mother.mother_id)
  }
  
  const grandparentsOfB = new Set()
  if (personBData?.father_id) {
    const father = familyMap.get(personBData.father_id)
    if (father?.father_id) grandparentsOfB.add(father.father_id)
    if (father?.mother_id) grandparentsOfB.add(father.mother_id)
  }
  if (personBData?.mother_id) {
    const mother = familyMap.get(personBData.mother_id)
    if (mother?.father_id) grandparentsOfB.add(mother.father_id)
    if (mother?.mother_id) grandparentsOfB.add(mother.mother_id)
  }
  
  const commonGrandparents = [...grandparentsOfA].filter(g => grandparentsOfB.has(g))
  if (commonGrandparents.length > 0) {
    if (personA.gender === 'M') {
      relationResult.value = '堂/表兄弟'
    } else {
      relationResult.value = '堂/表姐妹'
    }
    return
  }
  
  // 无法确定关系
  relationResult.value = '暂无法确定具体关系'
}

// 获取代数前缀
const getGenerationPrefix = (dist) => {
  if (dist <= 1) return ''
  if (dist === 2) return ''
  if (dist === 3) return '曾'
  if (dist === 4) return '高'
  return '远'
}

// 管理面板 - 可选的父母列表
const formAvailableParents = computed(() => {
  const currentId = editingPersonId.value
  const males = personList.value.filter(p => p.gender === 'M' && p.id !== currentId)
  const females = personList.value.filter(p => p.gender === 'F' && p.id !== currentId)
  return { males, females }
})

// 管理面板 - 过滤后的父亲列表
const filteredFormFathers = computed(() => {
  const searchText = formFatherSearchText.value.toLowerCase().trim()
  if (!searchText) return formAvailableParents.value.males
  return formAvailableParents.value.males.filter(p => p.name.toLowerCase().includes(searchText))
})

// 管理面板 - 过滤后的母亲列表
const filteredFormMothers = computed(() => {
  const searchText = formMotherSearchText.value.toLowerCase().trim()
  if (!searchText) return formAvailableParents.value.females
  return formAvailableParents.value.females.filter(p => p.name.toLowerCase().includes(searchText))
})

// 过滤配偶列表（根据新人性别过滤异性）
const filteredSpouses = computed(() => {
  const searchText = spouseSearchText.value.toLowerCase().trim()
  const targetGender = personForm.value.gender === 'M' ? 'F' : 'M'
  let list = personList.value.filter(p => p.gender === targetGender)
  if (searchText) {
    list = list.filter(p => p.name.toLowerCase().includes(searchText))
  }
  return list.slice(0, 20)
})

// 过滤"此人是谁的父/母"列表
const filteredChildOf = computed(() => {
  const searchText = childOfSearchText.value.toLowerCase().trim()
  const targetGender = personForm.value.gender === 'M' ? 'F' : 'M' // 找异性配偶
  let list = personList.value.filter(p => p.gender === targetGender)
  if (searchText) {
    list = list.filter(p => p.name.toLowerCase().includes(searchText))
  }
  return list.slice(0, 20)
})

// 选择配偶
const selectSpouse = (person) => {
  spousePerson.value = person
  spouseSearchText.value = person.name
  showSpouseDropdown.value = false
}

// 选择"此人是谁的父/母"
const selectChildOf = (person) => {
  childOfPerson.value = person
  childOfSearchText.value = person.name
  showChildOfDropdown.value = false
}

// 管理面板宽度调整
const startResizeManage = (e) => {
  isResizingManage.value = true
  document.addEventListener('mousemove', onResizeManage)
  document.addEventListener('mouseup', stopResizeManage)
  e.preventDefault()
}

const onResizeManage = (e) => {
  if (!isResizingManage.value) return
  const newWidth = window.innerWidth - e.clientX
  managePanelWidth.value = Math.max(350, Math.min(800, newWidth))
}

const stopResizeManage = () => {
  isResizingManage.value = false
  document.removeEventListener('mousemove', onResizeManage)
  document.removeEventListener('mouseup', stopResizeManage)
}

// 管理面板 - 选择父亲（自动填充配偶）
const selectFormFather = (person) => {
  if (person) {
    personForm.value.father_id = person.id
    formFatherSearchText.value = person.name
    
    // 自动填充配偶（母亲）- 查找该父亲的配偶
    const spouse = findSpouse(person.id)
    if (spouse && spouse.gender === 'F' && !personForm.value.mother_id) {
      personForm.value.mother_id = spouse.id
      formMotherSearchText.value = spouse.name
    }
  } else {
    personForm.value.father_id = null
    formFatherSearchText.value = ''
  }
  showFormFatherDropdown.value = false
}

// 管理面板 - 选择母亲（自动填充配偶）
const selectFormMother = (person) => {
  if (person) {
    personForm.value.mother_id = person.id
    formMotherSearchText.value = person.name
    
    // 自动填充配偶（父亲）- 查找该母亲的配偶
    const spouse = findSpouse(person.id)
    if (spouse && spouse.gender === 'M' && !personForm.value.father_id) {
      personForm.value.father_id = spouse.id
      formFatherSearchText.value = spouse.name
    }
  } else {
    personForm.value.mother_id = null
    formMotherSearchText.value = ''
  }
  showFormMotherDropdown.value = false
}

// 查找配偶（通过共同子女）
const findSpouse = (personId) => {
  const person = personList.value.find(p => p.id === personId)
  if (!person) return null
  
  // 查找有共同子女的人
  for (const child of personList.value) {
    if (child.father_id === personId && child.mother_id) {
      return personList.value.find(p => p.id === child.mother_id)
    }
    if (child.mother_id === personId && child.father_id) {
      return personList.value.find(p => p.id === child.father_id)
    }
  }
  return null
}

// 管理面板 - 清除父亲
const clearFormFather = () => {
  personForm.value.father_id = null
  formFatherSearchText.value = ''
}

// 管理面板 - 清除母亲
const clearFormMother = () => {
  personForm.value.mother_id = null
  formMotherSearchText.value = ''
}

// 保存父母关系
const saveParentRelation = async () => {
  if (!selectedPerson.value) return
  
  try {
    const data = {
      father_id: editFatherId.value,
      mother_id: editMotherId.value
    }
    await updatePerson(selectedPerson.value.id, data)
    
    // 更新本地数据
    selectedPerson.value.father_id = editFatherId.value ? String(editFatherId.value) : null
    selectedPerson.value.mother_id = editMotherId.value ? String(editMotherId.value) : null
    
    alert('父母关系更新成功！')
    
    // 刷新族谱
    await loadDefaultTree()
  } catch (error) {
    console.error('更新父母关系失败:', error)
    alert(error.response?.data?.detail || '更新失败')
  }
}

// 删除人物
const confirmDeletePerson = async () => {
  if (!selectedPerson.value) return
  
  try {
    await apiDeletePerson(selectedPerson.value.id)
    alert('删除成功！')
    
    showDeleteConfirm.value = false
    showPersonDetail.value = false
    selectedPerson.value = null
    
    // 刷新人员列表和族谱
    await loadPersonList()
    await loadDefaultTree()
  } catch (error) {
    console.error('删除失败:', error)
    alert(error.response?.data?.detail || '删除失败')
  }
}

const startEditMotto = () => {
  editMottoValue.value = selectedPerson.value?.motto || ''
  editingMotto.value = true
}

const startEditAchievements = () => {
  editAchievementsValue.value = selectedPerson.value?.achievements || ''
  editingAchievements.value = true
}

const saveMotto = async () => {
  try {
    const userId = currentUser.value?.id
    await updatePersonProfile(selectedPerson.value.id, { motto: editMottoValue.value }, userId)
    selectedPerson.value.motto = editMottoValue.value
    editingMotto.value = false
    alert('保存成功！')
  } catch (error) {
    console.error('保存失败:', error)
    alert(error.response?.data?.detail || '保存失败')
  }
}

const saveAchievements = async () => {
  try {
    const userId = currentUser.value?.id
    await updatePersonProfile(selectedPerson.value.id, { achievements: editAchievementsValue.value }, userId)
    selectedPerson.value.achievements = editAchievementsValue.value
    editingAchievements.value = false
    alert('保存成功！')
  } catch (error) {
    console.error('保存失败:', error)
    alert(error.response?.data?.detail || '保存失败')
  }
}

const startEditBiography = () => {
  editBiographyValue.value = selectedPerson.value?.biography || ''
  editingBiography.value = true
}

const saveBiography = async () => {
  try {
    const userId = currentUser.value?.id
    await updatePersonProfile(selectedPerson.value.id, { biography: editBiographyValue.value }, userId)
    selectedPerson.value.biography = editBiographyValue.value
    editingBiography.value = false
    alert('保存成功！')
  } catch (error) {
    console.error('保存失败:', error)
    alert(error.response?.data?.detail || '保存失败')
  }
}

// 切换详情面板位置
const toggleDetailPosition = () => {
  detailPosition.value = detailPosition.value === 'right' ? 'left' : 'right'
}

// 侧边栏宽度调整
const startResizeMenu = (e) => {
  isResizingMenu.value = true
  document.addEventListener('mousemove', onResizeMenu)
  document.addEventListener('mouseup', stopResizeMenu)
  e.preventDefault()
}

const onResizeMenu = (e) => {
  if (!isResizingMenu.value) return
  const newWidth = e.clientX
  menuWidth.value = Math.max(200, Math.min(600, newWidth))
}

const stopResizeMenu = () => {
  isResizingMenu.value = false
  document.removeEventListener('mousemove', onResizeMenu)
  document.removeEventListener('mouseup', stopResizeMenu)
}

const startResizeDetail = (e) => {
  isResizingDetail.value = true
  document.addEventListener('mousemove', onResizeDetail)
  document.addEventListener('mouseup', stopResizeDetail)
  e.preventDefault()
}

const onResizeDetail = (e) => {
  if (!isResizingDetail.value) return
  const windowWidth = window.innerWidth
  let newWidth
  if (detailPosition.value === 'right') {
    newWidth = windowWidth - e.clientX
  } else {
    newWidth = e.clientX
  }
  detailPanelWidth.value = Math.max(280, Math.min(600, newWidth))
}

const stopResizeDetail = () => {
  isResizingDetail.value = false
  document.removeEventListener('mousemove', onResizeDetail)
  document.removeEventListener('mouseup', stopResizeDetail)
}

// 切换日历类型（阳历/农历）
const toggleCalendarType = () => {
  calendarType.value = calendarType.value === 'solar' ? 'lunar' : 'solar'
}

// 农历转换算法
const lunarInfo = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0
]

const solarToLunar = (dateStr) => {
  if (!dateStr) return '未知'
  
  const lunarMonthNames = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']
  const lunarDayNames = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                         '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                         '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十']
  const tianGan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const diZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  
  try {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    // 计算农历
    let offset = Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(1900, 0, 31)) / 86400000)
    
    let lunarYear = 1900
    let daysInYear = 0
    for (let i = 1900; i < 2100 && offset > 0; i++) {
      daysInYear = 0
      for (let j = 0x8000; j > 0x8; j >>= 1) {
        daysInYear += (lunarInfo[i - 1900] & j) ? 30 : 29
      }
      daysInYear += (lunarInfo[i - 1900] & 0xf) === 0 ? 0 : ((lunarInfo[i - 1900] & 0x10000) ? 30 : 29)
      offset -= daysInYear
      lunarYear++
    }
    if (offset < 0) {
      offset += daysInYear
      lunarYear--
    }
    
    let lunarMonth = 1
    let leapMonth = lunarInfo[lunarYear - 1900] & 0xf
    let isLeap = false
    for (let i = 0x8000; i > 0x8; i >>= 1) {
      let daysInMonth = (lunarInfo[lunarYear - 1900] & i) ? 30 : 29
      if (offset < daysInMonth) break
      offset -= daysInMonth
      if (lunarMonth === leapMonth && !isLeap) {
        isLeap = true
      } else {
        lunarMonth++
        isLeap = false
      }
    }
    
    const lunarDay = offset + 1
    
    // 计算天干地支年
    const ganIndex = (lunarYear - 4) % 10
    const zhiIndex = (lunarYear - 4) % 12
    const ganZhiYear = tianGan[ganIndex] + diZhi[zhiIndex] + '年'
    
    return `${ganZhiYear} ${isLeap ? '闰' : ''}${lunarMonthNames[lunarMonth - 1]}${lunarDayNames[lunarDay - 1]}`
  } catch {
    return dateStr + ' (农历转换失败)'
  }
}

// 计算显示的出生日期
const displayBirthDate = computed(() => {
  const birthDate = selectedPerson.value?.birth_date
  if (!birthDate) return '未知'
  if (calendarType.value === 'solar') {
    return birthDate + ' (阳历)'
  } else {
    return solarToLunar(birthDate) + ' (农历)'
  }
})

// 职业编辑
const startEditOccupation = () => {
  editOccupationValue.value = selectedPerson.value?.occupation || ''
  editingOccupation.value = true
}

const saveOccupation = async () => {
  try {
    const userId = currentUser.value?.id
    await updatePersonProfile(selectedPerson.value.id, { occupation: editOccupationValue.value }, userId)
    selectedPerson.value.occupation = editOccupationValue.value
    editingOccupation.value = false
  } catch (error) {
    console.error('保存失败:', error)
    alert(error.response?.data?.detail || '保存失败')
  }
}

// 地址编辑
const startEditAddress = () => {
  editAddressValue.value = selectedPerson.value?.address || ''
  editingAddress.value = true
}

const saveAddress = async () => {
  try {
    const userId = currentUser.value?.id
    await updatePersonProfile(selectedPerson.value.id, { address: editAddressValue.value }, userId)
    selectedPerson.value.address = editAddressValue.value
    editingAddress.value = false
  } catch (error) {
    console.error('保存失败:', error)
    alert(error.response?.data?.detail || '保存失败')
  }
}

// 照片上传
const triggerPhotoUpload = () => {
  if (selectedPerson.value?.can_edit && avatarInput.value) {
    avatarInput.value.click()
  }
}

const handleAvatarUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // 显示裁切弹窗
  showCropModal.value = true
  cropImageSrc.value = URL.createObjectURL(file)
  originalImageFile.value = file
  
  // 清空 input
  event.target.value = ''
}

// 图片加载完成后初始化裁切区域
const onCropImageLoad = (e) => {
  const img = e.target
  imageSize.value = { width: img.naturalWidth, height: img.naturalHeight }
  // 初始化裁切区域为图片中心的正方形
  const minDim = Math.min(img.clientWidth, img.clientHeight)
  const size = Math.min(minDim * 0.8, 300)
  cropArea.value = {
    x: (img.clientWidth - size) / 2,
    y: (img.clientHeight - size) / 2,
    size: size
  }
}

// 开始拖动裁切框
const startCropDrag = (e) => {
  if (e.target.classList.contains('crop-resize-handle')) return
  isDraggingCrop.value = true
  cropDragStart.value = {
    x: e.clientX - cropArea.value.x,
    y: e.clientY - cropArea.value.y
  }
  e.preventDefault()
}

// 开始调整裁切框大小
const startCropResize = (e) => {
  isResizingCrop.value = true
  cropDragStart.value = {
    x: e.clientX,
    y: e.clientY,
    size: cropArea.value.size
  }
  e.preventDefault()
  e.stopPropagation()
}

// 拖动/调整裁切框
const onCropMove = (e) => {
  const container = cropperRef.value?.querySelector('.crop-image-container')
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  
  if (isDraggingCrop.value) {
    let newX = e.clientX - cropDragStart.value.x
    let newY = e.clientY - cropDragStart.value.y
    
    // 限制在图片范围内
    newX = Math.max(0, Math.min(newX, rect.width - cropArea.value.size))
    newY = Math.max(0, Math.min(newY, rect.height - cropArea.value.size))
    
    cropArea.value.x = newX
    cropArea.value.y = newY
  } else if (isResizingCrop.value) {
    const deltaX = e.clientX - cropDragStart.value.x
    const deltaY = e.clientY - cropDragStart.value.y
    const delta = Math.max(deltaX, deltaY)
    let newSize = cropDragStart.value.size + delta
    
    // 限制大小
    newSize = Math.max(50, newSize)
    newSize = Math.min(newSize, rect.width - cropArea.value.x)
    newSize = Math.min(newSize, rect.height - cropArea.value.y)
    
    cropArea.value.size = newSize
  }
}

// 结束拖动/调整
const endCropDrag = () => {
  isDraggingCrop.value = false
  isResizingCrop.value = false
}

// 取消裁切
const cancelCrop = () => {
  showCropModal.value = false
  cropImageSrc.value = ''
  originalImageFile.value = null
}

// 确认裁切并上传
const confirmCrop = async () => {
  const container = cropperRef.value?.querySelector('.crop-image-container')
  const img = container?.querySelector('img')
  if (!img || !originalImageFile.value) return
  
  try {
    // 计算实际裁切区域（相对于原图）
    const scaleX = imageSize.value.width / img.clientWidth
    const scaleY = imageSize.value.height / img.clientHeight
    
    const actualX = cropArea.value.x * scaleX
    const actualY = cropArea.value.y * scaleY
    const actualSize = cropArea.value.size * Math.min(scaleX, scaleY)
    
    // 创建canvas进行裁切 - 保持原始尺寸，不压缩
    const canvas = document.createElement('canvas')
    const outputSize = Math.round(actualSize) // 使用原始裁切尺寸，不缩放
    canvas.width = outputSize
    canvas.height = outputSize
    const ctx = canvas.getContext('2d')
    
    // 创建临时图片加载原图
    const tempImg = new Image()
    tempImg.crossOrigin = 'anonymous'
    
    await new Promise((resolve, reject) => {
      tempImg.onload = resolve
      tempImg.onerror = reject
      tempImg.src = cropImageSrc.value
    })
    
    // 绘制裁切区域
    ctx.drawImage(
      tempImg,
      actualX, actualY, actualSize, actualSize,
      0, 0, outputSize, outputSize
    )
    
    // 转换为Blob - 使用PNG格式保持最高画质，或JPEG质量设为1.0
    const fileExt = originalImageFile.value.name.split('.').pop().toLowerCase()
    const mimeType = ['png', 'gif', 'webp'].includes(fileExt) ? `image/${fileExt}` : 'image/png'
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, mimeType, 1.0) // 质量设为1.0，无损
    })
    
    // 创建File对象
    const croppedFile = new File([blob], originalImageFile.value.name, { type: mimeType })
    
    // 上传
    const userId = currentUser.value?.id
    const result = await uploadAvatar(selectedPerson.value.id, croppedFile, userId)
    if (result.success) {
      selectedPerson.value.avatar = result.avatar_url
      alert('头像上传成功！')
    }
    
    // 关闭弹窗
    cancelCrop()
  } catch (error) {
    console.error('裁切上传失败:', error)
    alert(error.response?.data?.detail || '上传失败')
  }
}

// 直接上传（不裁切）
const uploadWithoutCrop = async () => {
  if (!originalImageFile.value) return
  
  try {
    const userId = currentUser.value?.id
    const result = await uploadAvatar(selectedPerson.value.id, originalImageFile.value, userId)
    if (result.success) {
      selectedPerson.value.avatar = result.avatar_url
      alert('头像上传成功！')
    }
    cancelCrop()
  } catch (error) {
    console.error('上传失败:', error)
    alert(error.response?.data?.detail || '上传失败')
  }
}

// 图片查看器函数
const openImageViewer = () => {
  if (!selectedPerson.value?.avatar) return
  showImageViewer.value = true
  imageViewerScale.value = 1
  imageViewerPan.value = { x: 0, y: 0 }
}

const closeImageViewer = () => {
  showImageViewer.value = false
  isDraggingImage.value = false
}

const zoomImageIn = () => {
  imageViewerScale.value = Math.min(imageViewerScale.value * 1.25, 5)
}

const zoomImageOut = () => {
  imageViewerScale.value = Math.max(imageViewerScale.value / 1.25, 0.2)
}

const resetImageZoom = () => {
  imageViewerScale.value = 1
  imageViewerPan.value = { x: 0, y: 0 }
}

const onImageViewerWheel = (e) => {
  e.preventDefault()
  if (e.deltaY < 0) {
    imageViewerScale.value = Math.min(imageViewerScale.value * 1.1, 5)
  } else {
    imageViewerScale.value = Math.max(imageViewerScale.value / 1.1, 0.2)
  }
}

const startImageDrag = (e) => {
  isDraggingImage.value = true
  imageDragStart.value = {
    x: e.clientX - imageViewerPan.value.x,
    y: e.clientY - imageViewerPan.value.y
  }
}

const onImageDrag = (e) => {
  if (!isDraggingImage.value) return
  imageViewerPan.value = {
    x: e.clientX - imageDragStart.value.x,
    y: e.clientY - imageDragStart.value.y
  }
}

const endImageDrag = () => {
  isDraggingImage.value = false
}

// 配置
const CONFIG = {
  nodeWidth: 100,      // 增大节点宽度
  nodeHeight: 120,     // 增大节点高度以容纳照片
  nodeRadius: 8,
  hGap: 80,
  vGap: 140,
  spouseGap: 50,
  // 缩放阈值
  zoomThresholds: {
    showPhoto: 0.6,    // 大于此值显示照片
    showName: 0.4,     // 大于此值显示名称
    showDot: 0.2       // 小于此值只显示圆点
  },
  // 拖拽回弹配置
  dragSpring: {
    stiffness: 0.15,   // 弹簧刚度
    damping: 0.7,      // 阻尼系数
    threshold: 0.5     // 停止阈值
  },
  colors: {
    male: '#d4af37',      // 金色（男性）
    female: '#c0c0c0',    // 银色（女性）
    default: '#888888',
    line: 'rgba(255, 250, 0, 0.6)',  // 黄色连线
    text: '#fff',
    dotMale: '#fffa00',   // 亮黄色圆点
    dotFemale: '#f0f0f0'  // 白色圆点
  }
}

// 存储节点位置，用于搜索后居中
const nodePositions = ref(new Map())

// 存储节点原始位置（用于拖拽回弹）
const originalPositions = ref(new Map())

// 当前拖拽的节点
const draggingNode = ref(null)
const dragOffset = ref({ x: 0, y: 0 })

// 待拖拽信息（用于区分点击和拖拽）
const pendingDrag = ref(null)  // { personId, nodeGroup, offset, mouseDownPos, mouseDownTime }

// 回弹动画帧
const springAnimations = ref(new Map())

// 存储连线信息（用于拖拽时动态更新）
const nodeConnections = ref(new Map()) // personId -> { parentLine, spouseLine, childLines, junctionPoint }
const currentPositions = ref(new Map()) // 当前实时位置（拖拽时更新）

// 绘制族谱
const drawFamilyTree = (data, centerPersonId = null) => {
  const g = contentRef.value
  if (!g) return

  while (g.firstChild) g.removeChild(g.firstChild)

  const width = mainRef.value?.clientWidth || window.innerWidth
  const height = mainRef.value?.clientHeight || window.innerHeight - 56

  const personMap = new Map()
  data.nodes.forEach(node => {
    personMap.set(String(node.id), {
      id: String(node.id),
      label: node.label || node.name,
      gender: node.gender,
      avatar: node.avatar || null,
      fatherId: node.father_id ? String(node.father_id) : null,
      motherId: node.mother_id ? String(node.mother_id) : null
    })
  })

  const couples = new Map()
  const spouseOf = new Map()
  const singleParentChildren = new Map() // 只有一个父母的孩子
  const abnormalRelations = [] // 异常关系（如跨代关系）
  
  // 检测是否是某人的后代
  const isDescendantOf = (personId, ancestorId, visited = new Set()) => {
    if (visited.has(personId)) return false
    visited.add(personId)
    const person = personMap.get(personId)
    if (!person) return false
    if (person.fatherId === ancestorId || person.motherId === ancestorId) return true
    if (person.fatherId && isDescendantOf(person.fatherId, ancestorId, visited)) return true
    if (person.motherId && isDescendantOf(person.motherId, ancestorId, visited)) return true
    return false
  }
  
  personMap.forEach((person, id) => {
    const hasFather = person.fatherId && personMap.has(person.fatherId)
    const hasMother = person.motherId && personMap.has(person.motherId)
    
    if (hasFather && hasMother) {
      // 检测异常关系：父母之间是否有血缘关系
      const fatherIsDescendantOfMother = isDescendantOf(person.fatherId, person.motherId, new Set())
      const motherIsDescendantOfFather = isDescendantOf(person.motherId, person.fatherId, new Set())
      
      if (fatherIsDescendantOfMother || motherIsDescendantOfFather) {
        // 异常关系，记录下来单独处理
        abnormalRelations.push({
          childId: id,
          fatherId: person.fatherId,
          motherId: person.motherId
        })
      } else {
        // 正常关系
        const key = `${person.fatherId}-${person.motherId}`
        if (!couples.has(key)) {
          couples.set(key, { fatherId: person.fatherId, motherId: person.motherId, children: [] })
          spouseOf.set(person.fatherId, person.motherId)
          spouseOf.set(person.motherId, person.fatherId)
        }
        couples.get(key).children.push(id)
      }
    } else if (hasFather || hasMother) {
      // 只有一个父母在图中
      const parentId = hasFather ? person.fatherId : person.motherId
      if (!singleParentChildren.has(parentId)) {
        singleParentChildren.set(parentId, [])
      }
      singleParentChildren.get(parentId).push(id)
    }
  })

  const levels = new Map()
  
  const calculateLevel = (personId, visited = new Set()) => {
    if (visited.has(personId)) return levels.get(personId) || 0
    if (levels.has(personId)) return levels.get(personId)
    
    visited.add(personId)
    const person = personMap.get(personId)
    if (!person) return 0
    
    const hasFatherInGraph = person.fatherId && personMap.has(person.fatherId)
    const hasMotherInGraph = person.motherId && personMap.has(person.motherId)
    
    if (!hasFatherInGraph && !hasMotherInGraph) {
      const spouse = spouseOf.get(personId)
      if (spouse && levels.has(spouse)) {
        const level = levels.get(spouse)
        levels.set(personId, level)
        return level
      }
      levels.set(personId, 0)
      return 0
    }
    
    let parentLevel = 0
    if (hasFatherInGraph) parentLevel = Math.max(parentLevel, calculateLevel(person.fatherId, new Set(visited)))
    if (hasMotherInGraph) parentLevel = Math.max(parentLevel, calculateLevel(person.motherId, new Set(visited)))
    
    const myLevel = parentLevel + 1
    levels.set(personId, myLevel)
    return myLevel
  }
  
  personMap.forEach((_, id) => calculateLevel(id))
  
  couples.forEach(couple => {
    const fatherLevel = levels.get(couple.fatherId) || 0
    const motherLevel = levels.get(couple.motherId) || 0
    const maxLevel = Math.max(fatherLevel, motherLevel)
    levels.set(couple.fatherId, maxLevel)
    levels.set(couple.motherId, maxLevel)
  })

  const levelGroups = new Map()
  levels.forEach((level, personId) => {
    if (!levelGroups.has(level)) levelGroups.set(level, [])
    levelGroups.get(level).push(personId)
  })

  // 对每一层的人员进行排序：男性按年龄从大到小（从左到右），未知年龄排最右
  levelGroups.forEach((persons, level) => {
    persons.sort((aId, bId) => {
      const personA = personMap.get(aId)
      const personB = personMap.get(bId)
      
      // 首先按性别分组：男性在前
      if (personA.gender === 'M' && personB.gender !== 'M') return -1
      if (personA.gender !== 'M' && personB.gender === 'M') return 1
      
      // 同性别内按出生日期排序（年龄大的在左边，即出生日期早的在前）
      const birthA = personA.birth_date ? new Date(personA.birth_date).getTime() : Infinity
      const birthB = personB.birth_date ? new Date(personB.birth_date).getTime() : Infinity
      
      // 未知出生日期排在最右边
      if (birthA === Infinity && birthB !== Infinity) return 1
      if (birthA !== Infinity && birthB === Infinity) return -1
      
      return birthA - birthB  // 出生日期早的在前（年龄大）
    })
  })

  const positions = new Map()
  const maxLevel = Math.max(...Array.from(levels.values()))
  
  for (let level = maxLevel; level >= 0; level--) {
    const personsInLevel = levelGroups.get(level) || []
    const y = level * (CONFIG.nodeHeight + CONFIG.vGap) + 100
    
    if (level === maxLevel) {
      const totalWidth = personsInLevel.length * CONFIG.nodeWidth + (personsInLevel.length - 1) * CONFIG.hGap
      let startX = (width - totalWidth) / 2 + CONFIG.nodeWidth / 2
      personsInLevel.forEach(personId => {
        positions.set(personId, { x: startX, y })
        startX += CONFIG.nodeWidth + CONFIG.hGap
      })
    } else {
      const positioned = new Set()
      
      couples.forEach((couple) => {
        const fatherLevel = levels.get(couple.fatherId)
        const motherLevel = levels.get(couple.motherId)
        
        if (fatherLevel === level && motherLevel === level && 
            !positioned.has(couple.fatherId) && !positioned.has(couple.motherId)) {
          
          const childXs = couple.children.map(cid => positions.get(cid)).filter(p => p).map(p => p.x)
          let centerX = childXs.length > 0 ? (Math.min(...childXs) + Math.max(...childXs)) / 2 : width / 2
          
          // 父亲在左，母亲在右，两个卡片边缘之间间距为 spouseGap
          // 父亲右边缘 = centerX - spouseGap/2
          // 母亲左边缘 = centerX + spouseGap/2
          // 父亲中心 = 父亲右边缘 - nodeWidth/2 = centerX - spouseGap/2 - nodeWidth/2
          // 母亲中心 = 母亲左边缘 + nodeWidth/2 = centerX + spouseGap/2 + nodeWidth/2
          const fatherX = centerX - CONFIG.spouseGap / 2 - CONFIG.nodeWidth / 2
          const motherX = centerX + CONFIG.spouseGap / 2 + CONFIG.nodeWidth / 2
          
          positions.set(couple.fatherId, { x: fatherX, y })
          positions.set(couple.motherId, { x: motherX, y })
          positioned.add(couple.fatherId)
          positioned.add(couple.motherId)
        }
      })
      
      let nextX = 100
      positions.forEach(pos => { nextX = Math.max(nextX, pos.x + CONFIG.nodeWidth + CONFIG.hGap) })
      personsInLevel.forEach(personId => {
        if (!positioned.has(personId)) {
          positions.set(personId, { x: nextX, y })
          nextX += CONFIG.nodeWidth + CONFIG.hGap
        }
      })
    }
  }

  const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  linesGroup.setAttribute('id', 'lines-group')
  
  // 清空连线信息
  nodeConnections.value = new Map()
  currentPositions.value = new Map(positions)
  
  couples.forEach((couple) => {
    const fatherPos = positions.get(couple.fatherId)
    const motherPos = positions.get(couple.motherId)
    if (!fatherPos || !motherPos) return

    // 夫妻之间的连线 - 根据位置判断谁在左边谁在右边
    let leftPos, rightPos, leftId, rightId
    if (fatherPos.x < motherPos.x) {
      leftPos = fatherPos
      rightPos = motherPos
      leftId = couple.fatherId
      rightId = couple.motherId
    } else {
      leftPos = motherPos
      rightPos = fatherPos
      leftId = couple.motherId
      rightId = couple.fatherId
    }
    
    // 计算夫妻中点位置（交汇节点位置）
    const junctionX = (leftPos.x + rightPos.x) / 2
    const junctionY = leftPos.y  // 与卡片同高
    
    // 连线从左边卡片的右边缘中点，到交汇节点
    const spouseLineLeft = drawLine(
      linesGroup, 
      leftPos.x + CONFIG.nodeWidth / 2,  // 左边卡片的右边缘
      leftPos.y,                          // 卡片中心高度
      junctionX,                          // 交汇节点
      junctionY
    )
    spouseLineLeft.setAttribute('data-type', 'spouse-left')
    spouseLineLeft.setAttribute('data-left', leftId)
    spouseLineLeft.setAttribute('data-couple', `${couple.fatherId}-${couple.motherId}`)
    
    // 连线从交汇节点到右边卡片的左边缘中点
    const spouseLineRight = drawLine(
      linesGroup, 
      junctionX,                          // 交汇节点
      junctionY,
      rightPos.x - CONFIG.nodeWidth / 2,  // 右边卡片的左边缘
      rightPos.y                          // 卡片中心高度
    )
    spouseLineRight.setAttribute('data-type', 'spouse-right')
    spouseLineRight.setAttribute('data-right', rightId)
    spouseLineRight.setAttribute('data-couple', `${couple.fatherId}-${couple.motherId}`)
    
    // 绘制交汇节点（小圆点）
    const junctionCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    junctionCircle.setAttribute('cx', junctionX)
    junctionCircle.setAttribute('cy', junctionY)
    junctionCircle.setAttribute('r', 6)
    junctionCircle.setAttribute('fill', CONFIG.colors.line)
    junctionCircle.setAttribute('data-type', 'spouse-junction')
    junctionCircle.setAttribute('data-couple', `${couple.fatherId}-${couple.motherId}`)
    linesGroup.appendChild(junctionCircle)
    
    // 记录夫妻连线
    if (!nodeConnections.value.has(couple.fatherId)) {
      nodeConnections.value.set(couple.fatherId, { spouseLines: [], childLines: [], parentLine: null, junctionPoint: null, coupleJunction: null })
    }
    if (!nodeConnections.value.has(couple.motherId)) {
      nodeConnections.value.set(couple.motherId, { spouseLines: [], childLines: [], parentLine: null, junctionPoint: null, coupleJunction: null })
    }
    
    // 存储夫妻交汇节点信息
    const coupleJunctionInfo = { 
      x: junctionX, 
      y: junctionY, 
      circle: junctionCircle,
      leftLine: spouseLineLeft,
      rightLine: spouseLineRight
    }
    nodeConnections.value.get(couple.fatherId).spouseLines.push({ 
      line: spouseLineLeft, 
      lineRight: spouseLineRight,
      partnerId: couple.motherId, 
      isLeft: fatherPos.x < motherPos.x,
      junction: coupleJunctionInfo
    })
    nodeConnections.value.get(couple.motherId).spouseLines.push({ 
      line: spouseLineRight, 
      lineLeft: spouseLineLeft,
      partnerId: couple.fatherId, 
      isLeft: motherPos.x < fatherPos.x,
      junction: coupleJunctionInfo
    })
    nodeConnections.value.get(couple.fatherId).coupleJunction = coupleJunctionInfo
    nodeConnections.value.get(couple.motherId).coupleJunction = coupleJunctionInfo

    if (couple.children.length > 0) {
      const midX = (leftPos.x + rightPos.x) / 2  // 使用实际的中点（交汇节点位置）
      const childPositions = couple.children.map(cid => ({ id: cid, pos: positions.get(cid) })).filter(c => c.pos).sort((a, b) => a.pos.x - b.pos.x)

      if (childPositions.length > 0) {
        // 水平线位置：孩子上方
        const childY = childPositions[0].pos.y
        const dropY = childY - CONFIG.nodeHeight / 2 - 20
        
        // 从交汇节点垂直向下到水平线（从交汇节点下方开始）
        const verticalLine = drawLine(linesGroup, midX, junctionY, midX, dropY)
        verticalLine.setAttribute('data-type', 'parent-vertical')
        verticalLine.setAttribute('data-couple', `${couple.fatherId}-${couple.motherId}`)

        const leftX = childPositions[0].pos.x
        const rightX = childPositions[childPositions.length - 1].pos.x

        // 水平线
        const horizontalLine = drawLine(linesGroup, Math.min(leftX, midX), dropY, Math.max(rightX, midX), dropY)
        horizontalLine.setAttribute('data-type', 'parent-horizontal')

        // 每个孩子到水平线的垂直连线
        childPositions.forEach(child => {
          const childLine = drawLine(linesGroup, child.pos.x, dropY, child.pos.x, child.pos.y - CONFIG.nodeHeight / 2)
          childLine.setAttribute('data-type', 'child-vertical')
          childLine.setAttribute('data-child', child.id)
          
          // 记录孩子的连线信息
          if (!nodeConnections.value.has(child.id)) {
            nodeConnections.value.set(child.id, { spouseLines: [], childLines: [], parentLine: null, junctionPoint: null, coupleJunction: null })
          }
          nodeConnections.value.get(child.id).parentLine = childLine
          nodeConnections.value.get(child.id).junctionPoint = { x: child.pos.x, y: dropY }
        })
      }
    }
  })

  // 绘制单亲连线
  singleParentChildren.forEach((children, parentId) => {
    const parentPos = positions.get(parentId)
    if (!parentPos) return

    const childPositions = children.map(cid => ({ id: cid, pos: positions.get(cid) })).filter(c => c.pos).sort((a, b) => a.pos.x - b.pos.x)

    if (childPositions.length > 0) {
      const childY = childPositions[0].pos.y
      const dropY = childY - CONFIG.nodeHeight / 2 - 25

      // 从父母节点下方画垂直线到水平线
      drawLine(linesGroup, parentPos.x, parentPos.y + CONFIG.nodeHeight / 2, parentPos.x, dropY)

      const leftX = childPositions[0].pos.x
      const rightX = childPositions[childPositions.length - 1].pos.x

      // 画水平线
      if (childPositions.length > 1 || parentPos.x !== childPositions[0].pos.x) {
        drawLine(linesGroup, Math.min(leftX, parentPos.x), dropY, Math.max(rightX, parentPos.x), dropY)
      }

      // 从水平线到每个孩子的垂直线
      childPositions.forEach(child => {
        const childLine = drawLine(linesGroup, child.pos.x, dropY, child.pos.x, child.pos.y - CONFIG.nodeHeight / 2)
        childLine.setAttribute('data-type', 'child-vertical')
        childLine.setAttribute('data-child', child.id)
        
        if (!nodeConnections.value.has(child.id)) {
          nodeConnections.value.set(child.id, { spouseLines: [], childLines: [], parentLine: null, junctionPoint: null, coupleJunction: null })
        }
        nodeConnections.value.get(child.id).parentLine = childLine
        nodeConnections.value.get(child.id).junctionPoint = { x: child.pos.x, y: dropY }
      })
    }
  })

  // 绘制异常关系连线（跨代关系等）- 使用曲线虚线完全绕开所有节点
  const allPositionsList = Array.from(positions.values())
  abnormalRelations.forEach((relation, index) => {
    const childPos = positions.get(relation.childId)
    const fatherPos = positions.get(relation.fatherId)
    const motherPos = positions.get(relation.motherId)
    
    if (!childPos) return
    
    // 用红色曲线虚线连接父亲到孩子（向左绕开）
    if (fatherPos) {
      drawCurvedDashedLine(linesGroup, 
        fatherPos.x - CONFIG.nodeWidth / 2, fatherPos.y, 
        childPos.x - CONFIG.nodeWidth / 2, childPos.y, 
        '#e74c3c', 'left', allPositionsList)
    }
    
    // 用橙色曲线虚线连接母亲到孩子（向右绕开）
    if (motherPos) {
      drawCurvedDashedLine(linesGroup, 
        motherPos.x + CONFIG.nodeWidth / 2, motherPos.y, 
        childPos.x + CONFIG.nodeWidth / 2, childPos.y, 
        '#f39c12', 'right', allPositionsList)
    }
  })

  g.appendChild(linesGroup)

  const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  nodesGroup.setAttribute('id', 'nodes-group')
  
  // 保存原始位置用于拖拽回弹
  originalPositions.value = new Map(positions)
  
  personMap.forEach((person, id) => {
    const pos = positions.get(id)
    if (!pos) return

    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    nodeGroup.classList.add('node-group')
    nodeGroup.dataset.personId = String(person.id)
    nodeGroup.dataset.originalX = pos.x
    nodeGroup.dataset.originalY = pos.y
    nodeGroup.style.cursor = 'grab'
    nodeGroup.setAttribute('transform', `translate(${pos.x}, ${pos.y})`)

    // 创建不同缩放级别的显示元素
    // 1. 圆点模式（最小缩放）
    const dotGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    dotGroup.classList.add('dot-mode')
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    dot.setAttribute('cx', 0)
    dot.setAttribute('cy', 0)
    dot.setAttribute('r', 8)
    dot.setAttribute('fill', person.gender === 'M' ? CONFIG.colors.dotMale : CONFIG.colors.dotFemale)
    dotGroup.appendChild(dot)
    
    // 2. 名称模式（中等缩放）
    const nameGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    nameGroup.classList.add('name-mode')
    const nameRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    nameRect.setAttribute('x', -40)
    nameRect.setAttribute('y', -18)
    nameRect.setAttribute('width', 80)
    nameRect.setAttribute('height', 36)
    nameRect.setAttribute('rx', 6)
    nameRect.setAttribute('fill', person.gender === 'M' ? CONFIG.colors.male : CONFIG.colors.female)
    nameRect.setAttribute('stroke', '#4c51bf')
    nameRect.setAttribute('stroke-width', '2')
    nameGroup.appendChild(nameRect)
    
    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    nameText.setAttribute('x', 0)
    nameText.setAttribute('y', 5)
    nameText.setAttribute('text-anchor', 'middle')
    nameText.setAttribute('fill', CONFIG.colors.text)
    nameText.setAttribute('font-size', '14')
    nameText.setAttribute('font-weight', '500')
    nameText.textContent = person.label
    nameGroup.appendChild(nameText)
    
    // 3. 完整卡片模式（大缩放，显示照片和名称）
    const cardGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    cardGroup.classList.add('card-mode')
    
    // 卡片背景
    const cardRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    cardRect.setAttribute('x', -CONFIG.nodeWidth / 2)
    cardRect.setAttribute('y', -CONFIG.nodeHeight / 2)
    cardRect.setAttribute('width', CONFIG.nodeWidth)
    cardRect.setAttribute('height', CONFIG.nodeHeight)
    cardRect.setAttribute('rx', CONFIG.nodeRadius)
    cardRect.setAttribute('fill', person.gender === 'M' ? CONFIG.colors.male : CONFIG.colors.female)
    cardRect.setAttribute('stroke', '#4c51bf')
    cardRect.setAttribute('stroke-width', '2')
    cardGroup.appendChild(cardRect)
    
    // 照片区域（圆形裁剪）
    const photoSize = 60
    const photoY = -CONFIG.nodeHeight / 2 + 10
    
    // 创建裁剪路径
    const clipId = `clip-${person.id}`
    const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
    clipPath.setAttribute('id', clipId)
    const clipCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    clipCircle.setAttribute('cx', 0)
    clipCircle.setAttribute('cy', photoY + photoSize / 2)
    clipCircle.setAttribute('r', photoSize / 2)
    clipPath.appendChild(clipCircle)
    cardGroup.appendChild(clipPath)
    
    // 照片背景圆
    const photoBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    photoBg.setAttribute('cx', 0)
    photoBg.setAttribute('cy', photoY + photoSize / 2)
    photoBg.setAttribute('r', photoSize / 2)
    photoBg.setAttribute('fill', '#e0e0e0')
    photoBg.setAttribute('stroke', '#fff')
    photoBg.setAttribute('stroke-width', '2')
    cardGroup.appendChild(photoBg)
    
    // 如果有头像，显示图片
    if (person.avatar) {
      const photoImg = document.createElementNS('http://www.w3.org/2000/svg', 'image')
      photoImg.setAttribute('x', -photoSize / 2)
      photoImg.setAttribute('y', photoY)
      photoImg.setAttribute('width', photoSize)
      photoImg.setAttribute('height', photoSize)
      photoImg.setAttribute('href', person.avatar)
      photoImg.setAttribute('clip-path', `url(#${clipId})`)
      photoImg.setAttribute('preserveAspectRatio', 'xMidYMid slice')
      cardGroup.appendChild(photoImg)
    } else {
      // 没有头像，显示首字母
      const initialText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      initialText.setAttribute('x', 0)
      initialText.setAttribute('y', photoY + photoSize / 2 + 8)
      initialText.setAttribute('text-anchor', 'middle')
      initialText.setAttribute('fill', '#666')
      initialText.setAttribute('font-size', '24')
      initialText.setAttribute('font-weight', 'bold')
      initialText.textContent = person.label.charAt(0)
      cardGroup.appendChild(initialText)
    }
    
    // 名称
    const cardNameText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    cardNameText.setAttribute('x', 0)
    cardNameText.setAttribute('y', CONFIG.nodeHeight / 2 - 15)
    cardNameText.setAttribute('text-anchor', 'middle')
    cardNameText.setAttribute('fill', CONFIG.colors.text)
    cardNameText.setAttribute('font-size', '14')
    cardNameText.setAttribute('font-weight', '600')
    cardNameText.textContent = person.label
    cardGroup.appendChild(cardNameText)
    
    // 添加所有模式到节点组
    nodeGroup.appendChild(dotGroup)
    nodeGroup.appendChild(nameGroup)
    nodeGroup.appendChild(cardGroup)
    
    // 根据当前缩放级别设置初始可见性
    updateNodeVisibility(nodeGroup, scale.value)
    
    // 鼠标悬停效果
    const originalFill = person.gender === 'M' ? CONFIG.colors.male : CONFIG.colors.female
    nodeGroup.addEventListener('mouseenter', () => {
      cardRect.setAttribute('fill', '#4c51bf')
      cardRect.setAttribute('stroke-width', '3')
      nameRect.setAttribute('fill', '#4c51bf')
      nameRect.setAttribute('stroke-width', '3')
      dot.setAttribute('r', 10)
    })
    nodeGroup.addEventListener('mouseleave', () => {
      if (draggingNode.value !== person.id) {
        cardRect.setAttribute('fill', originalFill)
        cardRect.setAttribute('stroke-width', '2')
        nameRect.setAttribute('fill', originalFill)
        nameRect.setAttribute('stroke-width', '2')
        dot.setAttribute('r', 8)
      }
    })
    
    // 拖拽和点击事件 - 使用阈值区分点击和拖拽
    nodeGroup.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return // 只响应左键
      e.stopPropagation()
      
      // 取消该节点的回弹动画
      if (springAnimations.value.has(person.id)) {
        cancelAnimationFrame(springAnimations.value.get(person.id))
        springAnimations.value.delete(person.id)
      }
      
      // 计算鼠标在节点内的偏移（预先计算，但不立即开始拖拽）
      const currentTransform = nodeGroup.getAttribute('transform')
      const match = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/)
      const currentX = match ? parseFloat(match[1]) : pos.x
      const currentY = match ? parseFloat(match[2]) : pos.y
      
      // 转换鼠标坐标到SVG坐标系
      const svgPoint = getSVGPoint(e.clientX, e.clientY)
      
      // 存储待拖拽信息到全局变量
      pendingDrag.value = {
        personId: person.id,
        nodeGroup: nodeGroup,
        offset: {
          x: svgPoint.x - currentX,
          y: svgPoint.y - currentY
        },
        mouseDownPos: { x: e.clientX, y: e.clientY },
        mouseDownTime: Date.now()
      }
    })
    
    nodeGroup.addEventListener('mouseup', (e) => {
      if (!pendingDrag.value || pendingDrag.value.personId !== person.id) return
      
      const timeDiff = Date.now() - pendingDrag.value.mouseDownTime
      const posDiff = Math.abs(e.clientX - pendingDrag.value.mouseDownPos.x) + Math.abs(e.clientY - pendingDrag.value.mouseDownPos.y)
      
      // 如果没有开始拖拽（draggingNode为空），且是快速点击且移动距离小，视为点击
      if (!draggingNode.value && timeDiff < 300 && posDiff < 5) {
        e.stopPropagation()
        pendingDrag.value = null
        
        if (relationSelectMode.value) {
          const personData = personList.value.find(p => p.id === parseInt(person.id))
          if (personData) {
            completeRelationSelect(personData)
          }
          return
        }
        openPersonDetail(parseInt(person.id))
      }
    })

    nodesGroup.appendChild(nodeGroup)
  })

  g.appendChild(nodesGroup)

  // 保存节点位置供搜索居中使用
  nodePositions.value = new Map(positions)

  // 如果指定了要居中的人物（搜索模式），保持当前视角不变，直接开始搜索动画
  if (centerPersonId) {
    // 不修改 panX/panY，保持用户当前视角
    setTimeout(() => {
      searchAnimateTo(centerPersonId)
    }, 50)
    return
  }

  // 非搜索模式：默认居中整个图
  const allX = Array.from(positions.values()).map(p => p.x)
  const allY = Array.from(positions.values()).map(p => p.y)
  const graphCenterX = (Math.min(...allX) + Math.max(...allX)) / 2
  const graphCenterY = (Math.min(...allY) + Math.max(...allY)) / 2
  panX.value = width / 2 - graphCenterX
  panY.value = height / 2 - graphCenterY
}

// 更新节点显示模式（根据缩放级别）
const updateNodeVisibility = (nodeGroup, currentScale) => {
  const dotMode = nodeGroup.querySelector('.dot-mode')
  const nameMode = nodeGroup.querySelector('.name-mode')
  const cardMode = nodeGroup.querySelector('.card-mode')
  
  if (!dotMode || !nameMode || !cardMode) return
  
  const { showPhoto, showName, showDot } = CONFIG.zoomThresholds
  
  if (currentScale >= showPhoto) {
    // 大缩放：显示完整卡片（照片+名称）
    dotMode.style.display = 'none'
    nameMode.style.display = 'none'
    cardMode.style.display = 'block'
  } else if (currentScale >= showName) {
    // 中等缩放：只显示名称
    dotMode.style.display = 'none'
    nameMode.style.display = 'block'
    cardMode.style.display = 'none'
  } else {
    // 小缩放：只显示圆点
    dotMode.style.display = 'block'
    nameMode.style.display = 'none'
    cardMode.style.display = 'none'
  }
}

// 更新所有节点的显示模式
const updateAllNodesVisibility = () => {
  const g = contentRef.value
  if (!g) return
  
  const nodeGroups = g.querySelectorAll('.node-group')
  nodeGroups.forEach(nodeGroup => {
    updateNodeVisibility(nodeGroup, scale.value)
  })
}

// 将屏幕坐标转换为SVG坐标
const getSVGPoint = (clientX, clientY) => {
  const mainEl = mainRef.value
  if (!mainEl) return { x: 0, y: 0 }
  
  const rect = mainEl.getBoundingClientRect()
  // 屏幕坐标 -> 容器坐标 -> SVG坐标（考虑平移和缩放）
  const containerX = clientX - rect.left
  const containerY = clientY - rect.top
  const svgX = (containerX - panX.value) / scale.value
  const svgY = (containerY - panY.value) / scale.value
  
  return { x: svgX, y: svgY }
}

// 处理全局鼠标移动（拖拽节点）
const handleGlobalMouseMove = (e) => {
  // 检查是否需要开始拖拽（pendingDrag存在但draggingNode为空）
  if (pendingDrag.value && !draggingNode.value) {
    const moveDistance = Math.abs(e.clientX - pendingDrag.value.mouseDownPos.x) + Math.abs(e.clientY - pendingDrag.value.mouseDownPos.y)
    if (moveDistance > 5) {
      // 开始拖拽
      draggingNode.value = pendingDrag.value.personId
      dragOffset.value = pendingDrag.value.offset
      pendingDrag.value.nodeGroup.style.cursor = 'grabbing'
    }
  }
  
  if (!draggingNode.value) return
  
  const g = contentRef.value
  if (!g) return
  
  const nodeGroup = g.querySelector(`.node-group[data-person-id="${draggingNode.value}"]`)
  if (!nodeGroup) return
  
  const svgPoint = getSVGPoint(e.clientX, e.clientY)
  const newX = svgPoint.x - dragOffset.value.x
  const newY = svgPoint.y - dragOffset.value.y
  
  nodeGroup.setAttribute('transform', `translate(${newX}, ${newY})`)
  
  // 更新连线
  updateNodeLines(draggingNode.value, newX, newY)
}

// 处理全局鼠标释放（结束拖拽，开始回弹）
const handleGlobalMouseUp = (e) => {
  // 清除待拖拽状态
  pendingDrag.value = null
  
  if (!draggingNode.value) return
  
  const personId = draggingNode.value
  const g = contentRef.value
  if (!g) return
  
  const nodeGroup = g.querySelector(`.node-group[data-person-id="${personId}"]`)
  if (!nodeGroup) return
  
  nodeGroup.style.cursor = 'grab'
  
  // 获取当前位置
  const currentTransform = nodeGroup.getAttribute('transform')
  const match = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/)
  const currentX = match ? parseFloat(match[1]) : 0
  const currentY = match ? parseFloat(match[2]) : 0
  
  // 获取原始位置
  const originalX = parseFloat(nodeGroup.dataset.originalX)
  const originalY = parseFloat(nodeGroup.dataset.originalY)
  
  draggingNode.value = null
  
  // 开始弹性回弹动画（同时更新连线）
  startSpringAnimation(nodeGroup, personId, currentX, currentY, originalX, originalY)
}

// 弹性回弹动画
const startSpringAnimation = (nodeGroup, personId, startX, startY, targetX, targetY) => {
  let currentX = startX
  let currentY = startY
  let velocityX = 0
  let velocityY = 0
  
  const { stiffness, damping, threshold } = CONFIG.dragSpring
  
  const animate = () => {
    // 计算弹簧力
    const forceX = (targetX - currentX) * stiffness
    const forceY = (targetY - currentY) * stiffness
    
    // 更新速度（加上阻尼）
    velocityX = (velocityX + forceX) * damping
    velocityY = (velocityY + forceY) * damping
    
    // 更新位置
    currentX += velocityX
    currentY += velocityY
    
    nodeGroup.setAttribute('transform', `translate(${currentX}, ${currentY})`)
    
    // 同时更新连线
    updateNodeLines(personId, currentX, currentY)
    
    // 检查是否接近目标（停止条件）
    const distX = Math.abs(targetX - currentX)
    const distY = Math.abs(targetY - currentY)
    const speed = Math.abs(velocityX) + Math.abs(velocityY)
    
    if (distX < threshold && distY < threshold && speed < threshold) {
      // 到达目标，停止动画，恢复连线
      nodeGroup.setAttribute('transform', `translate(${targetX}, ${targetY})`)
      restoreNodeLines(personId)
      springAnimations.value.delete(personId)
    } else {
      // 继续动画
      const frameId = requestAnimationFrame(animate)
      springAnimations.value.set(personId, frameId)
    }
  }
  
  const frameId = requestAnimationFrame(animate)
  springAnimations.value.set(personId, frameId)
}

const drawLine = (parent, x1, y1, x2, y2) => {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line.setAttribute('x1', x1)
  line.setAttribute('y1', y1)
  line.setAttribute('x2', x2)
  line.setAttribute('y2', y2)
  line.setAttribute('stroke', CONFIG.colors.line)
  line.setAttribute('stroke-width', '3')  // 加粗连线
  line.setAttribute('stroke-linecap', 'round')  // 圆角端点
  parent.appendChild(line)
  return line  // 返回线条元素
}

// 更新节点相关的连线（拖拽时调用）
const updateNodeLines = (personId, newX, newY) => {
  const conn = nodeConnections.value.get(personId)
  if (!conn) return
  
  // 更新当前位置
  currentPositions.value.set(personId, { x: newX, y: newY })
  
  // 1. 更新到父母的连线（从交汇点到节点顶部的直线）
  if (conn.parentLine && conn.junctionPoint) {
    const junction = conn.junctionPoint
    conn.parentLine.setAttribute('x1', junction.x)
    conn.parentLine.setAttribute('y1', junction.y)
    conn.parentLine.setAttribute('x2', newX)
    conn.parentLine.setAttribute('y2', newY - CONFIG.nodeHeight / 2)
  }
  
  // 2. 更新夫妻连线（新结构：左线、右线、交汇节点）
  conn.spouseLines.forEach(({ line, lineRight, lineLeft, partnerId, isLeft, junction }) => {
    const partnerPos = currentPositions.value.get(partnerId)
    if (!partnerPos) return
    
    if (isLeft) {
      // 当前节点在左边，更新左线的起点（从当前节点到交汇点）
      line.setAttribute('x1', newX + CONFIG.nodeWidth / 2)
      line.setAttribute('y1', newY)
      // 交汇点保持不动，不需要更新
    } else {
      // 当前节点在右边，更新右线的终点（从交汇点到当前节点）
      line.setAttribute('x2', newX - CONFIG.nodeWidth / 2)
      line.setAttribute('y2', newY)
    }
  })
}

// 恢复节点连线到原始状态
const restoreNodeLines = (personId) => {
  const conn = nodeConnections.value.get(personId)
  if (!conn) return
  
  const originalPos = originalPositions.value.get(personId)
  if (!originalPos) return
  
  // 恢复当前位置记录
  currentPositions.value.set(personId, { x: originalPos.x, y: originalPos.y })
  
  // 1. 恢复到父母的连线
  if (conn.parentLine && conn.junctionPoint) {
    const junction = conn.junctionPoint
    conn.parentLine.setAttribute('x1', junction.x)
    conn.parentLine.setAttribute('y1', junction.y)
    conn.parentLine.setAttribute('x2', originalPos.x)
    conn.parentLine.setAttribute('y2', originalPos.y - CONFIG.nodeHeight / 2)
  }
  
  // 2. 恢复夫妻连线（新结构）
  conn.spouseLines.forEach(({ line, lineRight, lineLeft, partnerId, isLeft, junction }) => {
    const partnerOriginalPos = originalPositions.value.get(partnerId)
    if (!partnerOriginalPos) return
    
    if (isLeft) {
      // 当前节点在左边
      line.setAttribute('x1', originalPos.x + CONFIG.nodeWidth / 2)
      line.setAttribute('y1', originalPos.y)
    } else {
      // 当前节点在右边
      line.setAttribute('x2', originalPos.x - CONFIG.nodeWidth / 2)
      line.setAttribute('y2', originalPos.y)
    }
  })
}

// 绘制曲线虚线（用于异常关系，完全绕开节点和线条）
const drawCurvedDashedLine = (parent, x1, y1, x2, y2, color = '#e74c3c', curveDirection = 'left', allPositions = null) => {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  
  // 计算需要绕开多远
  let minX = Math.min(x1, x2)
  let maxX = Math.max(x1, x2)
  
  // 如果有所有节点位置，找到最左或最右的节点
  if (allPositions) {
    allPositions.forEach(pos => {
      minX = Math.min(minX, pos.x - 60)
      maxX = Math.max(maxX, pos.x + 60)
    })
  }
  
  // 大幅度绕开，确保不与任何东西相交
  const offset = curveDirection === 'left' ? minX - 80 : maxX + 80
  
  // 使用三段折线式曲线：先水平出去，再垂直下来，最后水平进入
  // 但用平滑曲线连接
  const cornerRadius = 20
  
  let d
  if (curveDirection === 'left') {
    // 向左绕：起点 → 左上角 → 左下角 → 终点
    const leftX = offset
    d = `M ${x1} ${y1} 
         L ${x1 - 30} ${y1}
         Q ${leftX} ${y1} ${leftX} ${y1 + cornerRadius}
         L ${leftX} ${y2 - cornerRadius}
         Q ${leftX} ${y2} ${leftX + cornerRadius} ${y2}
         L ${x2} ${y2}`
  } else {
    // 向右绕：起点 → 右上角 → 右下角 → 终点
    const rightX = offset
    d = `M ${x1} ${y1}
         L ${x1 + 30} ${y1}
         Q ${rightX} ${y1} ${rightX} ${y1 + cornerRadius}
         L ${rightX} ${y2 - cornerRadius}
         Q ${rightX} ${y2} ${rightX - cornerRadius} ${y2}
         L ${x2} ${y2}`
  }
  
  path.setAttribute('d', d)
  path.setAttribute('stroke', color)
  path.setAttribute('stroke-width', '2')
  path.setAttribute('stroke-dasharray', '6,4')
  path.setAttribute('fill', 'none')
  parent.appendChild(path)
}

// 动画相关
let animationId = null
const ZOOM_OUT_SCALE = 0.5   // 缩小时的缩放值（鸟瞰）
const ZOOM_IN_SCALE = 1.8    // 放大后的最终缩放值（突出目标）
const searchTargetPersonId = ref(null)  // 搜索目标人物ID，用于闪烁

// 缓动函数
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

// 通用动画函数
const animateValue = (from, to, duration, onUpdate, onComplete) => {
  const startTime = performance.now()
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeInOutCubic(progress)
    const currentValue = from + (to - from) * easedProgress
    
    onUpdate(currentValue)
    
    if (progress < 1) {
      animationId = requestAnimationFrame(animate)
    } else {
      animationId = null
      if (onComplete) onComplete()
    }
  }
  
  animationId = requestAnimationFrame(animate)
}

// 同时动画多个值
const animateMultiple = (animations, duration, onComplete) => {
  const startTime = performance.now()
  const startValues = animations.map(a => a.from)
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeInOutCubic(progress)
    
    animations.forEach((anim, i) => {
      const currentValue = startValues[i] + (anim.to - startValues[i]) * easedProgress
      anim.onUpdate(currentValue)
    })
    
    if (progress < 1) {
      animationId = requestAnimationFrame(animate)
    } else {
      animationId = null
      if (onComplete) onComplete()
    }
  }
  
  animationId = requestAnimationFrame(animate)
}

// 取消动画
const cancelAnimation = () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

// 让目标卡片闪烁
const blinkTargetCard = (personId, times = 3) => {
  const g = contentRef.value
  if (!g) return
  
  // 找到目标节点的rect
  const nodeGroups = g.querySelectorAll('.node-group')
  let targetRect = null
  
  nodeGroups.forEach(group => {
    if (group.dataset.personId === String(personId)) {
      targetRect = group.querySelector('rect')
    }
  })
  
  if (!targetRect) return
  
  const originalFill = targetRect.getAttribute('fill')
  const highlightColor = '#ff6b6b'
  let count = 0
  
  const blink = () => {
    if (count >= times * 2) {
      targetRect.setAttribute('fill', originalFill)
      return
    }
    
    targetRect.setAttribute('fill', count % 2 === 0 ? highlightColor : originalFill)
    count++
    setTimeout(blink, 200)
  }
  
  blink()
}

// 搜索动画：缩放 → 平移 → 缩放 → 闪烁
const searchAnimateTo = (personId) => {
  cancelAnimation()
  
  const pos = nodePositions.value.get(String(personId))
  if (!pos) return
  
  const mainEl = mainRef.value
  if (!mainEl) return
  
  const width = mainEl.clientWidth
  const height = mainEl.clientHeight
  
  // 记录初始状态
  const startScale = scale.value
  const startPanX = panX.value
  const startPanY = panY.value
  
  // 计算当前视角中心对应的画布坐标
  const viewCenterX = (width / 2 - startPanX) / startScale
  const viewCenterY = (height / 2 - startPanY) / startScale
  
  // 第1步：以当前视角中心为基准缩放到较小值（鸟瞰视角）
  const step1ZoomOut = () => {
    const startS = scale.value
    const startX = panX.value
    const startY = panY.value
    
    // 缩放后保持当前视角中心不变的目标pan值
    const targetPanX = width / 2 - viewCenterX * ZOOM_OUT_SCALE
    const targetPanY = height / 2 - viewCenterY * ZOOM_OUT_SCALE
    
    animateMultiple([
      { from: startS, to: ZOOM_OUT_SCALE, onUpdate: (v) => { scale.value = v } },
      { from: startX, to: targetPanX, onUpdate: (v) => { panX.value = v } },
      { from: startY, to: targetPanY, onUpdate: (v) => { panY.value = v } }
    ], 400, step2Pan)
  }
  
  // 第2步：平移到目标位置（目标人物居中）
  const step2Pan = () => {
    const targetX = width / 2 - pos.x * ZOOM_OUT_SCALE
    const targetY = height / 2 - pos.y * ZOOM_OUT_SCALE
    
    animateMultiple([
      { from: panX.value, to: targetX, onUpdate: (v) => { panX.value = v } },
      { from: panY.value, to: targetY, onUpdate: (v) => { panY.value = v } }
    ], 600, step3ZoomIn)
  }
  
  // 第3步：以目标人物为中心放大
  const step3ZoomIn = () => {
    const targetPosX = width / 2 - pos.x * ZOOM_IN_SCALE
    const targetPosY = height / 2 - pos.y * ZOOM_IN_SCALE
    
    animateMultiple([
      { from: scale.value, to: ZOOM_IN_SCALE, onUpdate: (v) => { scale.value = v } },
      { from: panX.value, to: targetPosX, onUpdate: (v) => { panX.value = v } },
      { from: panY.value, to: targetPosY, onUpdate: (v) => { panY.value = v } }
    ], 400, step4Blink)
  }
  
  // 第4步：闪烁目标卡片
  const step4Blink = () => {
    blinkTargetCard(personId, 3)
  }
  
  // 开始动画序列
  step1ZoomOut()
}

const loadFamilyTree = async (personId, shouldSearchAnimate = false) => {
  try {
    const data = await getFamilyTree(personId)
    if (!data || !data.nodes) { alert('数据格式错误'); return }
    drawFamilyTree(data, shouldSearchAnimate ? personId : null)
  } catch (error) {
    console.error('加载族谱数据失败:', error)
  }
}

// 将指定人物居中显示（带动画）
const centerOnPerson = (personId) => {
  searchAnimateTo(personId)
}

// 拼音首字母排序（简化版，按Unicode排序中文）
const sortByPinyin = (persons) => {
  return [...persons].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

// 获取汉字拼音首字母（简化版映射表）
const pinyinMap = {
  '张': 'Z', '王': 'W', '李': 'L', '赵': 'Z', '刘': 'L', '陈': 'C', '杨': 'Y', '黄': 'H',
  '周': 'Z', '吴': 'W', '徐': 'X', '孙': 'S', '马': 'M', '朱': 'Z', '胡': 'H', '郭': 'G',
  '何': 'H', '高': 'G', '林': 'L', '罗': 'L', '郑': 'Z', '梁': 'L', '谢': 'X', '宋': 'S',
  '唐': 'T', '许': 'X', '韩': 'H', '冯': 'F', '邓': 'D', '曹': 'C', '彭': 'P', '曾': 'Z',
  '萧': 'X', '田': 'T', '董': 'D', '袁': 'Y', '潘': 'P', '于': 'Y', '蒋': 'J', '蔡': 'C',
  '余': 'Y', '杜': 'D', '叶': 'Y', '程': 'C', '苏': 'S', '魏': 'W', '吕': 'L', '丁': 'D',
  '任': 'R', '沈': 'S', '姚': 'Y', '卢': 'L', '姜': 'J', '崔': 'C', '钟': 'Z', '谭': 'T',
  '陆': 'L', '汪': 'W', '范': 'F', '金': 'J', '石': 'S', '廖': 'L', '贾': 'J', '夏': 'X',
  '韦': 'W', '付': 'F', '方': 'F', '白': 'B', '邹': 'Z', '孟': 'M', '熊': 'X', '秦': 'Q',
  '邱': 'Q', '江': 'J', '尹': 'Y', '薛': 'X', '闫': 'Y', '段': 'D', '雷': 'L', '侯': 'H',
  '龙': 'L', '史': 'S', '陶': 'T', '黎': 'L', '贺': 'H', '顾': 'G', '毛': 'M', '郝': 'H',
  '龚': 'G', '邵': 'S', '万': 'W', '钱': 'Q', '严': 'Y', '覃': 'Q', '武': 'W', '戴': 'D',
  '莫': 'M', '孔': 'K', '向': 'X', '汤': 'T', '小': 'X', '明': 'M', '大': 'D', '中': 'Z',
  '国': 'G', '华': 'H', '建': 'J', '文': 'W', '平': 'P', '志': 'Z', '伟': 'W', '东': 'D',
  '海': 'H', '强': 'Q', '晓': 'X', '生': 'S', '光': 'G', '林': 'L', '军': 'J', '民': 'M',
  '永': 'Y', '杰': 'J', '涛': 'T', '昌': 'C', '成': 'C', '康': 'K', '星': 'X', '云': 'Y',
  '莲': 'L', '真': 'Z', '环': 'H', '雪': 'X', '荣': 'R', '爱': 'A', '妹': 'M', '霞': 'X',
  '香': 'X', '月': 'Y', '莺': 'Y', '媛': 'Y', '艳': 'Y', '瑞': 'R', '凡': 'F', '佳': 'J',
  '嘉': 'J', '琼': 'Q', '桂': 'G', '娣': 'D', '叶': 'Y', '璧': 'B', '璐': 'L', '娅': 'Y',
  '琦': 'Q', '晶': 'J', '妍': 'Y', '茜': 'Q', '秋': 'Q', '珊': 'S', '莎': 'S', '锦': 'J',
  '黛': 'D', '青': 'Q', '倩': 'Q', '婷': 'T', '姣': 'J', '婉': 'W', '娴': 'X', '瑾': 'J',
  '颖': 'Y', '露': 'L', '瑶': 'Y', '怡': 'Y', '婵': 'C', '雁': 'Y', '蓓': 'B', '纨': 'W',
  '仪': 'Y', '荷': 'H', '丹': 'D', '蓉': 'R', '眉': 'M', '君': 'J', '琴': 'Q', '蕊': 'R',
  '薇': 'W', '菁': 'J', '梦': 'M', '岚': 'L', '苑': 'Y', '婕': 'J', '馨': 'X', '瑗': 'Y',
  '琰': 'Y', '韵': 'Y', '融': 'R', '园': 'Y', '艺': 'Y', '咏': 'Y', '卿': 'Q', '聪': 'C',
  '澜': 'L', '纯': 'C', '毓': 'Y', '悦': 'Y', '昭': 'Z', '冰': 'B', '爽': 'S', '琬': 'W',
  '茗': 'M', '羽': 'Y', '希': 'X', '宁': 'N', '欣': 'X', '飘': 'P', '育': 'Y', '滢': 'Y',
  '馥': 'F', '筠': 'J', '柔': 'R', '竹': 'Z', '霭': 'A', '凝': 'N', '晓': 'X', '欢': 'H',
  '霄': 'X', '枫': 'F', '芸': 'Y', '菲': 'F', '寒': 'H', '伊': 'Y', '亚': 'Y', '宜': 'Y',
  '可': 'K', '姬': 'J', '舒': 'S', '影': 'Y', '荔': 'L', '枝': 'Z', '思': 'S', '丽': 'L',
  '秀': 'X', '娟': 'J', '英': 'Y', '芬': 'F', '芳': 'F', '燕': 'Y', '彩': 'C', '春': 'C',
  '菊': 'J', '兰': 'L', '凤': 'F', '洁': 'J', '梅': 'M', '琳': 'L', '素': 'S', '娜': 'N',
  '静': 'J', '淑': 'S', '惠': 'H', '珠': 'Z', '翠': 'C', '雅': 'Y', '芝': 'Z', '玉': 'Y',
  '萍': 'P', '红': 'H', '娥': 'E', '玲': 'L', '芬': 'F', '芳': 'F', '燕': 'Y', '彩': 'C',
  '一': 'Y', '二': 'E', '三': 'S', '四': 'S', '五': 'W', '六': 'L', '七': 'Q', '八': 'B',
  '九': 'J', '十': 'S', '百': 'B', '千': 'Q', '万': 'W', '亿': 'Y', '元': 'Y', '年': 'N',
  '月': 'Y', '日': 'R', '时': 'S', '分': 'F', '秒': 'M', '春': 'C', '夏': 'X', '秋': 'Q',
  '冬': 'D', '东': 'D', '南': 'N', '西': 'X', '北': 'B', '上': 'S', '下': 'X', '左': 'Z',
  '右': 'Y', '前': 'Q', '后': 'H', '里': 'L', '外': 'W', '内': 'N', '中': 'Z', '间': 'J',
  '天': 'T', '地': 'D', '人': 'R', '山': 'S', '水': 'S', '火': 'H', '木': 'M', '金': 'J',
  '土': 'T', '风': 'F', '雨': 'Y', '雷': 'L', '电': 'D', '云': 'Y', '雾': 'W', '霜': 'S',
  '雪': 'X', '冰': 'B', '河': 'H', '湖': 'H', '海': 'H', '江': 'J', '溪': 'X', '泉': 'Q',
  '井': 'J', '池': 'C', '塘': 'T', '沟': 'G', '渠': 'Q', '港': 'G', '湾': 'W', '洲': 'Z',
  '岛': 'D', '礁': 'J', '滩': 'T', '岸': 'A', '坡': 'P', '岭': 'L', '峰': 'F', '谷': 'G',
  '洞': 'D', '穴': 'X', '崖': 'Y', '壁': 'B', '石': 'S', '岩': 'Y', '矿': 'K', '玉': 'Y',
  '珍': 'Z', '珠': 'Z', '宝': 'B', '贝': 'B', '财': 'C', '富': 'F', '贵': 'G', '福': 'F',
  '禄': 'L', '寿': 'S', '喜': 'X', '乐': 'L', '安': 'A', '康': 'K', '宁': 'N', '和': 'H',
  '顺': 'S', '祥': 'X', '瑞': 'R', '吉': 'J', '庆': 'Q', '兴': 'X', '旺': 'W', '发': 'F',
  '达': 'D', '通': 'T', '畅': 'C', '泰': 'T', '盛': 'S', '昌': 'C', '隆': 'L', '茂': 'M'
}

// 获取字符串的拼音首字母
const getPinyinInitials = (str) => {
  if (!str) return ''
  return str.split('').map(char => {
    if (pinyinMap[char]) return pinyinMap[char]
    // 如果是英文字母，直接返回大写
    if (/[a-zA-Z]/.test(char)) return char.toUpperCase()
    return ''
  }).join('')
}

// 检查是否匹配拼音首字母
const matchPinyinInitials = (name, search) => {
  if (!name || !search) return false
  const searchUpper = search.toUpperCase()
  const initials = getPinyinInitials(name)
  return initials.includes(searchUpper)
}

const handleSearch = async () => {
  if (!searchName.value.trim()) { alert('请输入姓名'); return }
  try {
    const persons = await searchPersons(searchName.value)
    if (persons.length === 0) { 
      alert('未找到相关人员')
      return 
    }
    if (persons.length === 1) {
      // 只有一个结果，直接确认
      selectedSearchPerson.value = persons[0]
      showConfirmModal.value = true
    } else {
      // 多个结果，显示选择弹窗
      searchResults.value = sortByPinyin(persons)
      showSearchModal.value = true
    }
  } catch (error) {
    console.error('搜索失败:', error)
  }
}

// 选择搜索结果
const selectSearchResult = (person) => {
  selectedSearchPerson.value = person
  showSearchModal.value = false
  showConfirmModal.value = true
}

// 确认选择
const confirmSearchSelection = async () => {
  showConfirmModal.value = false
  if (selectedSearchPerson.value) {
    await loadFamilyTree(selectedSearchPerson.value.id, true)
    selectedSearchPerson.value = null
  }
}

// 取消选择
const cancelSearchSelection = () => {
  showConfirmModal.value = false
  selectedSearchPerson.value = null
}

const loadDefaultTree = async () => {
  try {
    const persons = await getPersons(0, 100)
    if (persons && persons.length > 0) {
      let selectedPerson = persons.find(p => {
        const hasParents = p.father_id || p.mother_id
        const hasChildren = persons.some(other => other.father_id === p.id || other.mother_id === p.id)
        return hasParents && hasChildren
      }) || persons.find(p => persons.some(other => other.father_id === p.id || other.mother_id === p.id)) || persons[0]
      
      if (selectedPerson) await loadFamilyTree(selectedPerson.id)
    }
  } catch (error) {
    console.error('默认加载失败:', error)
  }
}

// 点击外部关闭下拉框
const closeParentDropdowns = (e) => {
  if (!e.target.closest('.parent-search-box')) {
    showFatherDropdown.value = false
    showMotherDropdown.value = false
    showFormFatherDropdown.value = false
    showFormMotherDropdown.value = false
  }
}

onMounted(async () => {
  await nextTick()
  document.addEventListener('click', closeParentDropdowns)
  
  // 添加全局鼠标事件监听（用于节点拖拽）
  document.addEventListener('mousemove', handleGlobalMouseMove)
  document.addEventListener('mouseup', handleGlobalMouseUp)
  
  // 加载记住的密码
  loadRememberedPassword()
  
  // 初始化动态波浪背景
  initWaveBackground()
})

// 动态波浪背景系统
const initWaveBackground = () => {
  // 波浪线配置 - 6条不同的波浪
  const waves = [
    { y: 0.10, amplitude: 35, frequency: 0.008, speed: 0.00015, color: '#fffa00', opacity: 0.85, width: 3.2 },
    { y: 0.24, amplitude: 28, frequency: 0.012, speed: 0.00032, color: '#fff700', opacity: 0.6, width: 2.2 },
    { y: 0.40, amplitude: 42, frequency: 0.006, speed: 0.00023, color: '#666666', opacity: 0.35, width: 1.8 },
    { y: 0.56, amplitude: 32, frequency: 0.010, speed: 0.00018, color: '#fffa00', opacity: 0.55, width: 2.8 },
    { y: 0.72, amplitude: 38, frequency: 0.007, speed: 0.00043, color: '#888888', opacity: 0.3, width: 1.5 },
    { y: 0.86, amplitude: 25, frequency: 0.014, speed: 0.00024, color: '#fff700', opacity: 0.65, width: 2.5 }
  ]
  
  let canvas, ctx
  let width, height
  let time = parseFloat(sessionStorage.getItem('waveTime')) || 0
  let mouseX = -1000, mouseY = -1000
  let animating = true
  let lastSaveTime = Date.now()
  const TIME_INCREMENT = 1 // 固定时间增量，保持恒定速度
  
  const init = () => {
    let container = document.querySelector('.curved-lines-bg')
    if (!container) {
      container = document.createElement('div')
      container.className = 'curved-lines-bg'
      container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;background:#101010;'
      document.body.insertBefore(container, document.body.firstChild)
    }
    
    container.innerHTML = ''
    canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;'
    container.appendChild(canvas)
    ctx = canvas.getContext('2d')
    
    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX
      mouseY = e.clientY
    })
    
    animate()
  }
  
  const resize = () => {
    const dpr = window.devicePixelRatio || 1
    width = window.innerWidth
    height = window.innerHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    ctx.scale(dpr, dpr)
  }
  
  const drawWave = (wave, index) => {
    // 使用固定的基准位置，只有time影响相位
    const baseY = height * wave.y + Math.sin(time * 0.0005 + index * 1.7) * 12
    const points = 150
    const phase = time * wave.speed + index * 2.1 // 相位随时间线性变化
    
    const breatheWidth = 1 + 0.18 * Math.sin(time * 0.001 + index * 0.8)
    const lw = wave.width * breatheWidth
    
    const breatheLight = 1 + 0.15 * Math.sin(time * 0.0008 + index * 1.2)
    
    ctx.beginPath()
    ctx.strokeStyle = wave.color
    ctx.lineWidth = lw
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = wave.opacity * breatheLight
    
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * (width + 200) - 100
      
      let y = baseY
      // 波浪运动：相位随时间线性变化，速度恒定
      y += Math.sin(x * wave.frequency + phase) * wave.amplitude
      y += Math.sin(x * wave.frequency * 2.3 + phase * 1.5) * (wave.amplitude * 0.35)
      y += Math.sin(x * wave.frequency * 4.1 + phase * 2.2) * (wave.amplitude * 0.15)
      
      const distX = x - mouseX
      const distY = baseY - mouseY
      const dist = Math.sqrt(distX * distX + distY * distY)
      if (dist < 200) {
        const influence = (1 - dist / 200) * 25
        y += Math.sin(x * 0.02 + phase * 0.5) * influence
      }
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    
    ctx.stroke()
    
    ctx.shadowColor = wave.color
    ctx.shadowBlur = (8 + Math.sin(time * 0.001 + index) * 4) * breatheLight
    ctx.stroke()
    ctx.shadowBlur = 0
    
    ctx.globalAlpha = 1
  }
  
  const animate = () => {
    if (!animating) return
    
    ctx.clearRect(0, 0, width, height)
    
    for (let i = 0; i < waves.length; i++) {
      drawWave(waves[i], i)
    }
    
    time += TIME_INCREMENT // 固定增量，速度恒定
    
    if (Date.now() - lastSaveTime > 500) {
      sessionStorage.setItem('waveTime', time.toString())
      lastSaveTime = Date.now()
    }
    
    requestAnimationFrame(animate)
  }
  
  window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('waveTime', time.toString())
  })
  
  document.addEventListener('visibilitychange', () => {
    animating = !document.hidden
    if (animating) animate()
  })
  
  init()
}
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: hidden;
}

/* 登录页面样式 */
.login-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  position: relative;
}

.login-box {
  background: rgba(25, 25, 25, 0.95);
  border-radius: 16px;
  padding: 40px;
  width: 360px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 250, 0, 0.3);
  position: relative;
  z-index: 10;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  font-size: 28px;
  color: #fffa00;
  margin: 0 0 10px 0;
}

.login-header p {
  color: #888;
  margin: 0;
}

.login-form .form-group {
  margin-bottom: 20px;
}

.login-form label {
  display: block;
  margin-bottom: 8px;
  color: #f0f0f0;
  font-weight: 500;
}

.login-form input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #333;
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.3s;
  box-sizing: border-box;
  background: #1a1a1a;
  color: #f0f0f0;
}

.login-form input:focus {
  outline: none;
  border-color: #fffa00;
}

/* 密码输入框包装器 */
.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper input {
  padding-right: 45px;
}

.toggle-password-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  color: #888;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.toggle-password-btn:hover {
  color: #fffa00;
}

.toggle-password-btn svg {
  display: block;
}

/* 记住密码 */
.remember-password {
  margin-bottom: 20px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin-right: 8px;
  cursor: pointer;
  accent-color: #fffa00;
}

.checkbox-text {
  color: #888;
  font-size: 14px;
}

.login-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  color: #101010;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255, 250, 0, 0.4);
}

.login-links {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.login-links .link {
  color: #fffa00;
  cursor: pointer;
  font-size: 14px;
}

.login-links .link:hover {
  text-decoration: underline;
}

.register-tip {
  text-align: center;
  color: #666;
  font-size: 12px;
  margin-top: 15px;
  line-height: 1.5;
}

/* 左侧菜单 */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 200;
}

/* 可调整宽度的面板 */
.resizable-panel {
  position: relative;
}

.resize-handle {
  position: absolute;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  background: transparent;
  z-index: 10;
  transition: background 0.2s;
}

.resize-handle:hover,
.resize-handle:active {
  background: rgba(255, 250, 0, 0.3);
}

.side-menu .resize-handle {
  right: 0;
}

.person-detail-panel .resize-handle.handle-left {
  left: 0;
}

.person-detail-panel .resize-handle.handle-right {
  right: 0;
}

.side-menu {
  position: absolute;
  top: 0;
  left: 0;
  min-width: 200px;
  max-width: 600px;
  height: 100%;
  background: #191919;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  animation: menuSlideIn 0.3s ease;
}

@keyframes menuSlideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

.menu-header {
  padding: 20px;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  color: #101010;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-header h3 {
  margin: 0;
  font-size: 18px;
  color: #101010;
}

.menu-header .close-btn {
  color: #101010;
}

.menu-content {
  flex: 1;
  padding: 10px 0;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  cursor: pointer;
  transition: background 0.2s;
  color: #f0f0f0;
}

.menu-item:hover {
  background: #252525;
}

.menu-item span:first-child {
  font-size: 15px;
  color: #f0f0f0;
}

.menu-value {
  color: #fffa00;
  font-size: 13px;
}

.menu-footer {
  padding: 20px;
  border-top: 1px solid #333;
  background: #1a1a1a;
}

.menu-footer p {
  margin: 5px 0;
  font-size: 13px;
  color: #888;
}

/* 头部样式 */
.header {
  padding: 10px 20px;
  background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%);
  color: #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
  height: 56px;
  box-sizing: border-box;
  border-bottom: 2px solid rgba(255, 250, 0, 0.3);
}

.menu-btn {
  background: rgba(255, 250, 0, 0.2);
  border: none;
  color: #fffa00;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-btn:hover {
  background: rgba(255, 250, 0, 0.3);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h1 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #fffa00;
}

.user-info {
  font-size: 14px;
  background: rgba(255, 250, 0, 0.15);
  padding: 4px 12px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 250, 0, 0.3);
}

.logout-btn {
  background: rgba(255, 250, 0, 0.3);
  border: none;
  color: #fffa00;
  padding: 2px 10px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
}

.logout-btn:hover {
  background: rgba(255, 250, 0, 0.5);
}

.header-right {
  display: flex;
  gap: 15px;
  align-items: center;
}

.zoom-controls {
  display: flex;
  gap: 6px;
  align-items: center;
  background: rgba(255, 250, 0, 0.1);
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid rgba(255, 250, 0, 0.2);
}

.zoom-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: rgba(255, 250, 0, 0.2);
  color: #fffa00;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-btn:hover {
  background: rgba(255, 250, 0, 0.4);
}

.zoom-btn.reset-btn {
  width: auto;
  padding: 0 10px;
  border-radius: 13px;
  font-size: 12px;
}

.zoom-level {
  font-size: 12px;
  min-width: 40px;
  text-align: center;
  color: #f0f0f0;
}

.search-box {
  display: flex;
  gap: 8px;
}

.search-input {
  padding: 6px 12px;
  border: 2px solid rgba(255, 250, 0, 0.3);
  border-radius: 6px;
  font-size: 14px;
  width: 160px;
  background: rgba(25, 25, 25, 0.95);
  color: #f0f0f0;
}

.search-input:focus {
  outline: none;
  border-color: #fffa00;
}

.search-btn {
  padding: 6px 12px;
  background: rgba(255, 250, 0, 0.2);
  color: #fffa00;
  border: 2px solid rgba(255, 250, 0, 0.5);
  border-radius: 6px;
  cursor: pointer;
}

.admin-btn {
  padding: 6px 14px;
  background: #d4af37;
  color: #101010;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.admin-btn:hover {
  background: #fffa00;
}

/* 主内容区 */
.main-content {
  flex: 1;
  overflow: hidden;
  background: transparent;
  position: relative;
}

/* 关系选择模式提示条 */
.tree-select-hint {
  position: absolute;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 15px;
  background: linear-gradient(135deg, #d4af37 0%, #fffa00 100%);
  color: #101010;
  padding: 12px 24px;
  border-radius: 50px;
  box-shadow: 0 8px 30px rgba(255, 250, 0, 0.4);
  animation: floatHint 3s ease-in-out infinite;
}

@keyframes floatHint {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-5px); }
}

.tree-select-hint .hint-text {
  font-size: 14px;
}

.tree-select-hint strong {
  color: #101010;
  font-weight: bold;
}

.hint-cancel-btn {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: rgba(0, 0, 0, 0.2);
  color: #101010;
}

.hint-cancel-btn:hover {
  background: rgba(0, 0, 0, 0.3);
}

.family-tree-svg {
  width: 100%;
  height: 100%;
  background: transparent;
}

/* 节点组样式 */
.node-group {
  transition: filter 0.2s ease;
}

.node-group:hover {
  filter: drop-shadow(0 4px 12px rgba(255, 250, 0, 0.3));
}

/* 节点显示模式 */
.dot-mode, .name-mode, .card-mode {
  pointer-events: none;
}

/* 管理面板（侧边栏） */
.manage-sidebar {
  position: fixed;
  top: 56px;
  right: 0;
  height: calc(100vh - 56px);
  min-width: 350px;
  max-width: 800px;
  background: #191919;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  z-index: 150;
  animation: slideInRight 0.3s ease;
}

.manage-sidebar .resize-handle {
  left: 0;
  right: auto;
}

.panel-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  color: #101010;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  color: #101010;
  font-size: 20px;
  cursor: pointer;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid #333;
}

.panel-tabs button {
  flex: 1;
  padding: 12px;
  border: none;
  background: #252525;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
  color: #888;
}

.panel-tabs button.active {
  background: #191919;
  color: #fffa00;
  font-weight: 600;
}

/* 关系定位模式选择 */
.relation-mode-select {
  width: 100%;
  padding: 10px 12px;
  background: #252525;
  border: 2px solid #333;
  color: #f0f0f0;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.relation-mode-select:focus {
  outline: none;
  border-color: #fffa00;
}

.relation-hint {
  margin-top: 10px;
  padding: 10px;
  background: rgba(255, 250, 0, 0.1);
  border: 1px solid rgba(255, 250, 0, 0.3);
  border-radius: 6px;
  font-size: 13px;
  color: #888;
}

.relation-hint strong {
  color: #fffa00;
}

.panel-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  background: #191919;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-row .form-group {
  flex: 1;
}

.panel-content .form-group {
  margin-bottom: 16px;
}

.panel-content .form-group.full-width {
  width: 100%;
}

.panel-content label {
  display: block;
  margin-bottom: 6px;
  color: #f0f0f0;
  font-weight: 500;
  font-size: 14px;
}

.panel-content input,
.panel-content select,
.panel-content textarea {
  width: 100%;
  padding: 10px 12px;
  background: #252525;
  border: 2px solid #333;
  color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.panel-content input:focus,
.panel-content select:focus,
.panel-content textarea:focus {
  outline: none;
  border-color: #fffa00;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-primary {
  padding: 10px 24px;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  color: #101010;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary:hover {
  background: #fffa00;
}

.btn-secondary {
  padding: 10px 24px;
  background: #333;
  color: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.person-list {
  max-height: 400px;
  overflow-y: auto;
}

.person-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #333;
  border-radius: 8px;
  margin-bottom: 8px;
  background: #252525;
}

.person-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.person-name {
  font-weight: 600;
  color: #f0f0f0;
}

.person-id {
  color: #666;
  font-size: 13px;
}

.person-gender {
  background: #333;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  color: #888;
}

.person-actions {
  display: flex;
  gap: 8px;
}

.btn-edit {
  padding: 6px 12px;
  background: #d4af37;
  color: #101010;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-delete {
  padding: 6px 12px;
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.empty-list {
  text-align: center;
  color: #666;
  padding: 40px;
}

/* 个人详情弹窗 */
.person-detail-panel {
  position: fixed;
  top: 56px;
  min-width: 280px;
  max-width: 600px;
  height: calc(100vh - 56px);
  background: #191919;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.person-detail-panel.position-left {
  left: 0;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.5);
  animation: slideInLeft 0.3s ease;
}

.person-detail-panel.position-right {
  right: 0;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
  animation: slideInRight 0.3s ease;
}

@keyframes slideInLeft {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.detail-header {
  padding: 10px 15px;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  color: #101010;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.detail-header h3 {
  margin: 0;
  font-size: 15px;
  flex: 1;
  text-align: center;
}

.position-toggle-btn {
  background: rgba(0, 0, 0, 0.2);
  border: none;
  color: #101010;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.position-toggle-btn:hover {
  background: rgba(0, 0, 0, 0.35);
}

.detail-header .close-btn {
  background: rgba(0, 0, 0, 0.2);
  border: none;
  color: #101010;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-header .close-btn:hover {
  background: rgba(0, 0, 0, 0.3);
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #191919;
}

/* 照片区域 */
.photo-section {
  margin-bottom: 20px;
}

.photo-display {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 12px 12px 0 0;
  overflow: hidden;
  border: 3px solid #d4af37;
  border-bottom: none;
  cursor: pointer;
}

.photo-display:hover .photo-view-hint {
  opacity: 1;
}

.photo-view-hint {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 8px;
  text-align: center;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s;
}

.photo-upload-btn {
  background: rgba(255, 250, 0, 0.15);
  border: 3px solid #d4af37;
  border-top: 1px solid #d4af37;
  border-radius: 0 0 12px 12px;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #fffa00;
  font-size: 14px;
}

.photo-upload-btn:hover {
  background: rgba(255, 250, 0, 0.25);
}

.person-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #101010;
}

.photo-placeholder.male {
  background: linear-gradient(135deg, #d4af37 0%, #fffa00 100%);
}

.photo-placeholder.female {
  background: linear-gradient(135deg, #c0c0c0 0%, #f0f0f0 100%);
}

.photo-placeholder .placeholder-text {
  font-size: 60px;
  font-weight: bold;
  margin-bottom: 10px;
}

.photo-placeholder .no-photo-text {
  font-size: 14px;
  opacity: 0.8;
}

/* 图片查看器样式 */
.image-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
  z-index: 5000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.image-viewer-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.image-viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(25, 25, 25, 0.9);
  border-bottom: 1px solid #333;
}

.viewer-title {
  color: #fffa00;
  font-size: 16px;
  font-weight: 600;
}

.viewer-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.viewer-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 250, 0, 0.15);
  color: #fffa00;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.viewer-btn:hover {
  background: rgba(255, 250, 0, 0.3);
}

.viewer-zoom-level {
  color: #888;
  font-size: 13px;
  min-width: 50px;
  text-align: center;
}

.viewer-close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 71, 87, 0.2);
  color: #ff4757;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-left: 10px;
}

.viewer-close-btn:hover {
  background: rgba(255, 71, 87, 0.4);
}

.image-viewer-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: grab;
}

.image-viewer-body:active {
  cursor: grabbing;
}

.viewer-image {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  transition: transform 0.1s ease-out;
  user-select: none;
  border-radius: 8px;
  box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
}

.image-viewer-footer {
  padding: 12px 20px;
  background: rgba(25, 25, 25, 0.9);
  border-top: 1px solid #333;
  text-align: center;
}

.viewer-hint {
  color: #666;
  font-size: 12px;
}

/* 姓名区域 */
.name-section {
  text-align: center;
  padding-bottom: 15px;
  border-bottom: 1px solid #333;
  margin-bottom: 15px;
}

.person-name {
  margin: 0 0 8px 0;
  font-size: 22px;
  color: #fffa00;
}

.person-meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.person-gender-tag {
  background: #252525;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  color: #888;
}

.person-age-tag {
  background: rgba(255, 250, 0, 0.15);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  color: #fffa00;
  font-weight: 500;
}

/* 已故状态提示 */
.deceased-notice {
  background: linear-gradient(135deg, #252525 0%, #1a1a1a 100%);
  border: 1px solid #333;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.deceased-icon {
  font-size: 20px;
}

.deceased-text {
  font-size: 14px;
  color: #888;
  font-weight: 500;
}

.deceased-date {
  font-size: 12px;
  color: #666;
  margin-left: 5px;
}

/* 可编辑信息项 */
.editable-info .info-value-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inline-edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.inline-edit-btn:hover {
  opacity: 1;
}

.inline-edit-area {
  display: flex;
  align-items: center;
  gap: 6px;
}

.inline-edit-area input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #333;
  border-radius: 4px;
  font-size: 13px;
  background: #252525;
  color: #f0f0f0;
}

.inline-save-btn, .inline-cancel-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.inline-save-btn {
  background: #52c41a;
  color: #fff;
}

.inline-save-btn:hover {
  background: #389e0d;
}

.inline-cancel-btn {
  background: #333;
  color: #888;
}

.inline-cancel-btn:hover {
  background: #444;
}

/* 日期显示 */
.date-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calendar-toggle {
  background: #333;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.calendar-toggle:hover {
  background: #444;
}

/* 旧头像样式保留兼容 */
.avatar-placeholder {
  position: relative;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  border-radius: 50%;
  cursor: pointer;
}

.avatar-placeholder .avatar-overlay span {
  font-size: 24px;
}

.avatar-placeholder:hover .avatar-overlay {
  opacity: 1;
}

.avatar-placeholder {
  position: relative;
}

.detail-content .person-name {
  font-size: 24px;
  font-weight: 600;
  color: #fffa00;
  margin: 0 0 8px 0;
}

.person-gender-tag {
  display: inline-block;
  padding: 4px 12px;
  background: #252525;
  border-radius: 20px;
  font-size: 13px;
  color: #888;
}

/* 信息区域 */
.info-section {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #333;
}

.info-item label {
  color: #666;
  font-size: 14px;
}

.info-item span {
  color: #f0f0f0;
  font-size: 14px;
  font-weight: 500;
}

.info-item span.alive {
  color: #52c41a;
}

/* 可编辑区域 */
.editable-section {
  background: #252525;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-header label {
  font-weight: 600;
  color: #f0f0f0;
  font-size: 14px;
}

.edit-btn {
  padding: 4px 12px;
  background: #d4af37;
  color: #101010;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.edit-btn:hover {
  background: #fffa00;
}

.section-content {
  color: #888;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.edit-area textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #333;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
  background: #1a1a1a;
  color: #f0f0f0;
}

.edit-area textarea:focus {
  outline: none;
  border-color: #fffa00;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.save-btn {
  padding: 6px 16px;
  background: #52c41a;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.save-btn:hover {
  background: #389e0d;
}

.cancel-btn {
  padding: 6px 16px;
  background: #333;
  color: #888;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.cancel-btn:hover {
  background: #444;
}

/* 生平简介 */
.bio-section {
  margin-top: 15px;
}

.bio-section label {
  display: block;
  font-weight: 600;
  color: #f0f0f0;
  font-size: 14px;
  margin-bottom: 10px;
}

.bio-content {
  color: #888;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}

/* 搜索结果弹窗 */
.search-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.search-modal {
  background: #191919;
  border-radius: 20px;
  width: 420px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  animation: modalSlideIn 0.3s ease;
  border: 1px solid rgba(255, 250, 0, 0.3);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.search-modal-header {
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  color: #101010;
  padding: 25px 20px;
  text-align: center;
}

.search-modal-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.search-modal-header h3 {
  margin: 0 0 5px 0;
  font-size: 20px;
  font-weight: 600;
}

.search-modal-hint {
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
}

.search-modal-body {
  max-height: 350px;
  overflow-y: auto;
  background: #191919;
}

.search-results-list {
  padding: 10px;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  margin: 5px 0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  background: #252525;
}

.search-result-item:hover {
  background: #333;
  border-color: #fffa00;
  transform: translateX(5px);
}

.result-avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: #101010;
  margin-right: 15px;
  flex-shrink: 0;
}

.result-avatar.male {
  background: linear-gradient(135deg, #d4af37 0%, #fffa00 100%);
}

.result-avatar.female {
  background: linear-gradient(135deg, #c0c0c0 0%, #f0f0f0 100%);
}

.result-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.result-name {
  font-size: 16px;
  font-weight: 600;
  color: #f0f0f0;
}

.result-meta {
  font-size: 12px;
  color: #666;
  margin-top: 3px;
}

.result-arrow {
  font-size: 18px;
  color: #666;
  transition: all 0.2s;
}

.search-result-item:hover .result-arrow {
  color: #fffa00;
  transform: translateX(5px);
}

.search-modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #333;
  text-align: center;
  background: #191919;
}

.modal-cancel-btn {
  padding: 10px 30px;
  background: #333;
  color: #888;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-cancel-btn:hover {
  background: #444;
}

/* 确认选择弹窗 */
.confirm-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  backdrop-filter: blur(4px);
}

.confirm-modal {
  background: #191919;
  border-radius: 20px;
  width: 360px;
  max-width: 90vw;
  padding: 30px;
  text-align: center;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  animation: modalSlideIn 0.3s ease;
  border: 1px solid rgba(255, 250, 0, 0.3);
}

.confirm-modal-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.confirm-modal h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #f0f0f0;
}

.confirm-person-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 20px;
  background: #252525;
  border-radius: 15px;
  margin-bottom: 20px;
}

.confirm-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  color: #101010;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.confirm-avatar.male {
  background: linear-gradient(135deg, #d4af37 0%, #fffa00 100%);
}

.confirm-avatar.female {
  background: linear-gradient(135deg, #c0c0c0 0%, #f0f0f0 100%);
}

.confirm-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.confirm-name {
  font-size: 22px;
  font-weight: 700;
  color: #f0f0f0;
}

.confirm-meta {
  font-size: 13px;
  color: #666;
  margin-top: 3px;
}

.confirm-text {
  color: #888;
  font-size: 14px;
  margin-bottom: 25px;
}

.confirm-text strong {
  color: #fffa00;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-cancel-btn {
  padding: 12px 30px;
  background: #333;
  color: #888;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-cancel-btn:hover {
  background: #444;
}

.confirm-ok-btn {
  padding: 12px 30px;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  color: #101010;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(255, 250, 0, 0.4);
}

.confirm-ok-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 250, 0, 0.5);
}

/* 管理员操作区域 */
.admin-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px dashed #333;
}

.admin-section-header {
  margin-bottom: 15px;
}

.admin-badge {
  display: inline-block;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  color: #101010;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.parent-edit-section {
  background: #252525;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
}

.parent-edit-item {
  margin-bottom: 12px;
}

.parent-edit-item label {
  display: block;
  font-size: 13px;
  color: #888;
  margin-bottom: 5px;
  font-weight: 500;
}

.parent-search-box {
  position: relative;
}

.parent-search-input {
  width: 100%;
  padding: 10px 35px 10px 12px;
  border: 1px solid #333;
  border-radius: 8px;
  font-size: 14px;
  background: #1a1a1a;
  color: #f0f0f0;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.parent-search-input:focus {
  outline: none;
  border-color: #fffa00;
}

.clear-parent-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: #333;
  border: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
}

.clear-parent-btn:hover {
  background: #444;
}

.parent-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  margin-top: 4px;
}

.parent-dropdown-item {
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
  color: #f0f0f0;
}

.parent-dropdown-item:hover {
  background: #333;
}

.parent-dropdown-item.selected {
  background: rgba(255, 250, 0, 0.15);
  color: #fffa00;
}

.parent-dropdown-item.none-option {
  color: #666;
  border-bottom: 1px solid #333;
}

.parent-item-name {
  font-weight: 500;
}

.parent-item-hint {
  font-size: 12px;
  color: #666;
}

.parent-dropdown-empty {
  padding: 15px;
  text-align: center;
  color: #666;
  font-size: 13px;
}

.parent-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #333;
  border-radius: 8px;
  font-size: 14px;
  background: #1a1a1a;
  color: #f0f0f0;
  cursor: pointer;
  transition: border-color 0.2s;
}

.parent-select:focus {
  outline: none;
  border-color: #fffa00;
}

.save-parent-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  color: #101010;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 10px;
}

.save-parent-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 250, 0, 0.4);
}

.danger-zone {
  margin-top: 15px;
  padding: 15px;
  background: rgba(255, 71, 87, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 71, 87, 0.3);
}

.delete-person-btn {
  width: 100%;
  padding: 12px;
  background: #ff4757;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-person-btn:hover {
  background: #ff3344;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4);
}

/* 删除确认弹窗 */
.delete-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  backdrop-filter: blur(4px);
}

.delete-confirm-modal {
  background: #191919;
  border-radius: 20px;
  width: 380px;
  max-width: 90vw;
  padding: 30px;
  text-align: center;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  animation: modalSlideIn 0.3s ease;
  border: 1px solid rgba(255, 71, 87, 0.3);
}

.delete-confirm-icon {
  font-size: 56px;
  margin-bottom: 15px;
}

.delete-confirm-modal h3 {
  margin: 0 0 15px 0;
  font-size: 22px;
  color: #f0f0f0;
}

.delete-warning {
  font-size: 16px;
  color: #f0f0f0;
  margin-bottom: 10px;
}

.delete-warning strong {
  color: #ff4757;
}

.delete-hint {
  font-size: 13px;
  color: #666;
  margin-bottom: 25px;
  line-height: 1.5;
}

.delete-confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.delete-cancel-btn {
  padding: 12px 30px;
  background: #333;
  color: #888;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-cancel-btn:hover {
  background: #444;
}

.delete-confirm-btn {
  padding: 12px 30px;
  background: #ff4757;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-confirm-btn:hover {
  background: #ff3344;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4);
}

/* 关系查询弹窗 */
.relation-query-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2500;
  backdrop-filter: blur(4px);
}

.relation-query-modal {
  background: #191919;
  border-radius: 24px;
  width: 560px;
  max-width: 95vw;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  animation: modalSlideIn 0.3s ease;
  overflow: hidden;
  border: 1px solid rgba(255, 250, 0, 0.3);
}

.relation-query-header {
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  padding: 20px 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.relation-query-header h3 {
  margin: 0;
  color: #101010;
  font-size: 20px;
  font-weight: 600;
}

.relation-query-header .close-btn {
  background: rgba(0, 0, 0, 0.2);
  border: none;
  color: #101010;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.relation-query-header .close-btn:hover {
  background: rgba(0, 0, 0, 0.3);
  transform: rotate(90deg);
}

.relation-query-body {
  padding: 30px;
  background: #191919;
}

.relation-select-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 250, 0, 0.1);
  border: 2px solid #fffa00;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 20px;
  animation: hintPulse 2s ease-in-out infinite;
}

@keyframes hintPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 250, 0, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(255, 250, 0, 0); }
}

.relation-select-hint .hint-icon {
  font-size: 24px;
  animation: pointUp 1s ease-in-out infinite;
}

@keyframes pointUp {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.relation-select-hint span {
  flex: 1;
  font-size: 14px;
  color: #fffa00;
}

.relation-select-hint strong {
  color: #d4af37;
}

.cancel-select-btn {
  padding: 6px 14px;
  background: #252525;
  color: #fffa00;
  border: 1px solid #fffa00;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-select-btn:hover {
  background: #fffa00;
  color: #101010;
}

.relation-select-row {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 25px;
}

.relation-select-item {
  flex: 1;
}

.relation-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.relation-item-header label {
  font-size: 14px;
  font-weight: 600;
  color: #888;
  margin: 0;
}

.pick-from-tree-btn {
  padding: 5px 10px;
  background: rgba(255, 250, 0, 0.1);
  color: #fffa00;
  border: 1px solid #fffa00;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.pick-from-tree-btn:hover:not(:disabled) {
  background: rgba(255, 250, 0, 0.2);
  transform: translateY(-1px);
}

.pick-from-tree-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.relation-select-item label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #888;
  margin-bottom: 10px;
}

.relation-arrow {
  font-size: 28px;
  color: #fffa00;
  margin-top: 45px;
  font-weight: bold;
}

.relation-search-box {
  position: relative;
}

.relation-search-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #333;
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.2s;
  box-sizing: border-box;
  background: #252525;
  color: #f0f0f0;
}

.relation-search-input:focus {
  outline: none;
  border-color: #fffa00;
  box-shadow: 0 0 0 4px rgba(255, 250, 0, 0.1);
}

.relation-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 12px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.relation-dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.relation-dropdown-item:hover {
  background: #333;
}

.relation-item-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #101010;
}

.relation-item-avatar.male {
  background: linear-gradient(135deg, #d4af37 0%, #fffa00 100%);
}

.relation-item-avatar.female {
  background: linear-gradient(135deg, #c0c0c0 0%, #f0f0f0 100%);
}

.relation-item-name {
  font-size: 14px;
  color: #f0f0f0;
}

.selected-person-card {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 12px 16px;
  background: #252525;
  border-radius: 12px;
  border: 2px solid #fffa00;
}

.selected-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: #101010;
}

.selected-avatar.male {
  background: linear-gradient(135deg, #d4af37 0%, #fffa00 100%);
}

.selected-avatar.female {
  background: linear-gradient(135deg, #c0c0c0 0%, #f0f0f0 100%);
}

.selected-name {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #f0f0f0;
}

.clear-selected {
  background: none;
  border: none;
  color: #666;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.clear-selected:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #888;
}

.query-relation-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  color: #101010;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 20px;
}

.query-relation-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 250, 0, 0.4);
}

.query-relation-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.relation-result {
  margin-top: 10px;
}

.relation-result-card {
  background: #252525;
  border: 2px solid #fffa00;
  border-radius: 16px;
  padding: 25px;
  text-align: center;
}

.result-persons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.result-person-name {
  font-size: 18px;
  font-weight: 700;
  color: #fffa00;
  background: rgba(255, 250, 0, 0.1);
  padding: 4px 12px;
  border-radius: 8px;
}

.result-relation-text {
  font-size: 16px;
  color: #888;
}

.result-relation-name {
  font-size: 32px;
  font-weight: 800;
  color: #fffa00;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 关系查询子菜单样式 */
.side-menu.expanded {
  width: 380px;
}

.menu-item.active {
  background: #252525;
}

.menu-arrow {
  font-size: 10px;
  color: #666;
  transition: transform 0.2s;
}

.relation-submenu {
  background: #1a1a1a;
  border-top: 1px solid #333;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 500px; }
}

.relation-submenu-content {
  padding: 15px 20px;
}

.relation-select-group {
  margin-bottom: 15px;
  position: relative;
}

.relation-select-group label {
  display: block;
  font-size: 13px;
  color: #888;
  margin-bottom: 8px;
  font-weight: 500;
}

.relation-input-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #252525;
  border: 2px solid #333;
  border-radius: 10px;
  padding: 4px;
  transition: border-color 0.2s;
}

.relation-input-box:focus-within {
  border-color: #fffa00;
}

.relation-input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 8px 10px;
  font-size: 14px;
  color: #f0f0f0;
  outline: none;
}

.relation-input::placeholder {
  color: #666;
}

.clear-input-btn {
  background: #333;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #888;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.clear-input-btn:hover {
  background: #444;
  color: #f0f0f0;
}

.pick-tree-btn {
  background: rgba(255, 250, 0, 0.15);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: #fffa00;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.pick-tree-btn:hover {
  background: rgba(255, 250, 0, 0.25);
}

.selected-person-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(255, 250, 0, 0.1);
  border: 1px solid #fffa00;
  border-radius: 8px;
}

.tag-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #101010;
}

.tag-avatar.male {
  background: linear-gradient(135deg, #d4af37 0%, #fffa00 100%);
}

.tag-avatar.female {
  background: linear-gradient(135deg, #c0c0c0 0%, #f0f0f0 100%);
}

.tag-name {
  font-size: 14px;
  color: #fffa00;
  font-weight: 500;
}

.relation-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 10px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  z-index: 200;
}

.dropdown-person-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.dropdown-person-item:hover {
  background: #333;
}

.person-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #101010;
}

.person-avatar.male {
  background: linear-gradient(135deg, #d4af37 0%, #fffa00 100%);
}

.person-avatar.female {
  background: linear-gradient(135deg, #c0c0c0 0%, #f0f0f0 100%);
}

.person-name {
  font-size: 14px;
  color: #f0f0f0;
}

.relation-query-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  color: #101010;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 5px;
}

.relation-query-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 250, 0, 0.4);
}

.relation-query-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.relation-result-box {
  margin-top: 15px;
  padding: 15px;
  background: #252525;
  border: 2px solid #fffa00;
  border-radius: 12px;
  text-align: center;
}

.result-text {
  font-size: 13px;
  color: #888;
  margin-bottom: 8px;
}

.result-name {
  color: #fffa00;
  font-weight: 600;
}

.result-connector {
  margin: 0 4px;
}

.result-relation {
  font-size: 24px;
  font-weight: 800;
  color: #fffa00;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 搜索下拉框样式 */
.search-box {
  position: relative;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 10px;
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  z-index: 300;
}

.search-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.search-dropdown-item:hover {
  background: #333;
}

.suggestion-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #101010;
}

.suggestion-avatar.male {
  background: linear-gradient(135deg, #d4af37 0%, #fffa00 100%);
}

.suggestion-avatar.female {
  background: linear-gradient(135deg, #c0c0c0 0%, #f0f0f0 100%);
}

.suggestion-name {
  font-size: 14px;
  color: #f0f0f0;
}

/* 图片裁切弹窗样式 */
.crop-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  backdrop-filter: blur(4px);
}

.crop-modal {
  background: #191919;
  border-radius: 20px;
  width: 500px;
  max-width: 95vw;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  animation: modalSlideIn 0.3s ease;
  border: 1px solid rgba(255, 250, 0, 0.3);
}

.crop-modal-header {
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.crop-modal-header h3 {
  margin: 0;
  color: #101010;
  font-size: 18px;
  font-weight: 600;
}

.crop-modal-header .close-btn {
  background: rgba(0, 0, 0, 0.2);
  border: none;
  color: #101010;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.crop-modal-header .close-btn:hover {
  background: rgba(0, 0, 0, 0.3);
}

.crop-modal-body {
  padding: 20px;
  background: #191919;
}

.crop-image-container {
  position: relative;
  width: 100%;
  max-height: 400px;
  overflow: hidden;
  border-radius: 12px;
  background: #101010;
}

.crop-preview-image {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  display: block;
}

.crop-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.crop-area {
  position: absolute;
  border: 3px solid #fffa00;
  border-radius: 50%;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  cursor: move;
  pointer-events: auto;
}

.crop-resize-handle {
  position: absolute;
  right: -8px;
  bottom: -8px;
  width: 20px;
  height: 20px;
  background: #fffa00;
  border-radius: 50%;
  cursor: se-resize;
  border: 2px solid #101010;
}

.crop-hint {
  text-align: center;
  color: #666;
  font-size: 13px;
  margin-top: 12px;
  margin-bottom: 0;
}

.crop-modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #191919;
}

.crop-skip-btn {
  padding: 10px 16px;
  background: transparent;
  color: #888;
  border: 1px solid #333;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.crop-skip-btn:hover {
  background: #252525;
  color: #f0f0f0;
}

.crop-actions {
  display: flex;
  gap: 10px;
}

.crop-cancel-btn {
  padding: 10px 20px;
  background: #333;
  color: #888;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.crop-cancel-btn:hover {
  background: #444;
}

.crop-confirm-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #fffa00 0%, #d4af37 100%);
  color: #101010;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.crop-confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 250, 0, 0.4);
}
</style>
