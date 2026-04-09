// Текущее состояние приложения
const state = {
    currentScenario: 'unconscious',
    conversationHistory: [],
    userActions: [],
    errors: [],
    progress: 35,
    testAnswers: {},
    apiKey: CONFIG.DEEPSEEK_API_KEY,
    useRealAPI: true,
    isAPIActive: true,
    config: {
        autoScroll: true,
        soundEffects: true,
        lastUpdate: new Date().toISOString()
    }
};

// DOM элементы
let chatMessages, userInput, sendBtn, analyzeBtn, resetBtn, hintBtn;
let scenarioBtns, tabBtns, apiStatus;
let useRealAPICheckbox, currentModeSpan, apiStatusText, lastUpdateSpan;

// Инициализация приложения
function initApp() {
    // Получаем DOM элементы
    chatMessages = document.getElementById('chat-messages');
    userInput = document.getElementById('user-input');
    sendBtn = document.getElementById('send-btn');
    analyzeBtn = document.getElementById('analyze-btn');
    resetBtn = document.getElementById('reset-btn');
    hintBtn = document.getElementById('hint-btn');
    scenarioBtns = document.querySelectorAll('.scenario-btn');
    tabBtns = document.querySelectorAll('.tab-btn');
    apiStatus = document.getElementById('api-status');
    useRealAPICheckbox = document.getElementById('use-real-api');
    currentModeSpan = document.getElementById('current-mode');
    apiStatusText = document.getElementById('api-status-text');
    lastUpdateSpan = document.getElementById('last-update');
    
    loadConfig();
    updateUI();
    initChat();
    initEventListeners();
    updateErrorDisplay();
}

// Загрузка конфигурации из localStorage
function loadConfig() {
    try {
        const savedConfig = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            
            if (parsed.apiKey) {
                state.apiKey = parsed.apiKey;
            }
            
            if (parsed.useRealAPI !== undefined) {
                state.useRealAPI = parsed.useRealAPI;
                if (useRealAPICheckbox) useRealAPICheckbox.checked = parsed.useRealAPI;
            }
            
            if (parsed.config) {
                state.config = { ...state.config, ...parsed.config };
            }
            
            if (parsed.progress) state.progress = parsed.progress;
            if (parsed.errors) state.errors = parsed.errors;
            if (parsed.userActions) state.userActions = parsed.userActions;
        }
    } catch (error) {
        console.error('Ошибка загрузки конфигурации:', error);
    }
    
    if (lastUpdateSpan) {
        lastUpdateSpan.textContent = new Date(state.config.lastUpdate).toLocaleString('ru-RU');
    }
}

// Сохранение конфигурации в localStorage
function saveConfig() {
    try {
        state.config.lastUpdate = new Date().toISOString();
        if (lastUpdateSpan) {
            lastUpdateSpan.textContent = new Date(state.config.lastUpdate).toLocaleString('ru-RU');
        }
        
        const configToSave = {
            apiKey: state.apiKey,
            useRealAPI: state.useRealAPI,
            progress: state.progress,
            errors: state.errors,
            userActions: state.userActions,
            config: state.config,
            version: CONFIG.VERSION
        };
        
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(configToSave));
        console.log('Конфигурация сохранена');
    } catch (error) {
        console.error('Ошибка сохранения конфигурации:', error);
    }
}

// Обновление UI
function updateUI() {
    // Обновляем статус API
    if (state.apiKey && state.useRealAPI && API.isAvailable()) {
        state.isAPIActive = true;
        if (apiStatus) {
            apiStatus.className = 'status-indicator status-active';
            apiStatus.innerHTML = '<div class="status-dot"></div><span>API DeepSeek подключен</span>';
        }
        if (apiStatusText) apiStatusText.textContent = 'Подключен';
        if (currentModeSpan) currentModeSpan.textContent = 'Режим реального ИИ';
    } else if (state.apiKey && !state.useRealAPI) {
        state.isAPIActive = false;
        if (apiStatus) {
            apiStatus.className = 'status-indicator status-inactive';
            apiStatus.innerHTML = '<div class="status-dot"></div><span>API отключен (симуляция)</span>';
        }
        if (apiStatusText) apiStatusText.textContent = 'Отключен (симуляция)';
        if (currentModeSpan) currentModeSpan.textContent = 'Режим симуляции';
    } else {
        state.isAPIActive = false;
        if (apiStatus) {
            apiStatus.className = 'status-indicator status-inactive';
            apiStatus.innerHTML = '<div class="status-dot"></div><span>API DeepSeek не подключен</span>';
        }
        if (apiStatusText) apiStatusText.textContent = 'Не подключен';
        if (currentModeSpan) currentModeSpan.textContent = 'Режим симуляции';
    }
    
    // Обновляем прогресс
    const overallProgress = document.getElementById('overall-progress');
    const progressText = document.getElementById('progress-text');
    if (overallProgress) overallProgress.style.width = `${state.progress}%`;
    if (progressText) progressText.textContent = `${state.progress}% — ${getProgressText(state.progress)}`;
}

// Получение текста прогресса
function getProgressText(progress) {
    if (progress < 30) return 'начальный уровень';
    if (progress < 60) return 'освоены базовые навыки';
    if (progress < 90) return 'хороший уровень подготовки';
    return 'отличный уровень подготовки';
}

// Добавление сообщения в чат
function addMessage(sender, text, senderName = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    
    if (sender === 'ai') {
        messageDiv.classList.add('ai-message');
        senderName = senderName || 'ИИ-симулятор';
    } else {
        messageDiv.classList.add('user-message');
        senderName = senderName || 'Обучающийся';
    }
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <i class="fas ${sender === 'ai' ? 'fa-robot' : 'fa-user'}"></i> ${senderName}
        </div>
        <div class="message-text">${text}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    if (state.config.autoScroll) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Сохраняем в историю
    state.conversationHistory.push({
        sender,
        text,
        timestamp: new Date().toISOString()
    });
    
    return messageDiv;
}

// Загрузка сценария
function loadScenario(scenario) {
    state.currentScenario = scenario;
    state.conversationHistory = [];
    
    // Обновляем активную кнопку сценария
    scenarioBtns.forEach(btn => {
        if (btn.dataset.scenario === scenario) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Обновляем теоретический материал
    document.querySelectorAll('.material-section').forEach(section => {
        if (section.id === `material-${scenario}`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });
    
    // Добавляем описание сценария
    let scenarioDescription = '';
    switch(scenario) {
        case 'unconscious':
            scenarioDescription = 'Вы обнаружили человека без сознания. Он не реагирует на оклик и прикосновения. Что вы будете делать?';
            break;
        case 'cpr':
            scenarioDescription = 'Вы обнаружили человека без сознания и без признаков дыхания. Грудная клетка не движется, вы не чувствуете выдоха. Что вы будете делать?';
            break;
        case 'bleeding':
            scenarioDescription = 'Вы обнаружили человека с сильным кровотечением из руки. Кровь ярко-красного цвета, вытекает пульсирующей струей. Что вы будете делать?';
            break;
        case 'fracture':
            scenarioDescription = 'Человек упал с высоты, жалуется на сильную боль в ноге. Нога деформирована, пострадавший не может пошевелить ею. Что вы будете делать?';
            break;
        case 'burn':
            scenarioDescription = 'Человек получил ожог кипятком. На руке покраснение и пузыри. Пострадавший жалуется на сильную боль. Что вы будете делать?';
            break;
        case 'caxap':
            scenarioDescription = 'Человек жалуется на слабость, головокружение. У него диабет. Что вы будете делать?';
            break;
        case 'legal':
            scenarioDescription = 'Рассмотрим юридические аспекты оказания первой помощи. Вы можете задавать вопросы о правах, обязанностях и ответственности.';
            break;
        default:
            scenarioDescription = 'Опишите ваши действия для оказания первой помощи.';
    }
    
    addMessage('ai', `<strong>Текущий сценарий:</strong> ${getScenarioName(scenario)}<br><strong>Описание:</strong> ${scenarioDescription}`, 'ИИ-симулятор');
}

// Получение названия сценария
function getScenarioName(scenario) {
    const names = {
        'unconscious': 'Отсутствие сознания',
        'cpr': 'Остановка дыхания и кровообращения',
        'bleeding': 'Наружные кровотечения',
        'fracture': 'Травмы и переломы',
        'burn': 'Ожоги и воздействие температур',
        'caxap': 'Сахарный диабет',
        'legal': 'Юридические аспекты'
    };
    return names[scenario] || scenario;
}

// Отправка сообщения пользователя
async function sendUserMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    addMessage('user', message);
    userInput.value = '';
    
    // Добавляем сообщение в историю действий
    state.userActions.push({
        action: message,
        scenario: state.currentScenario,
        timestamp: new Date().toISOString()
    });
    
    // Показываем индикатор загрузки
    const loadingMessage = addMessage('ai', '<div class="loading"></div> ИИ обрабатывает запрос...', 'ИИ-симулятор');
    
    // Получаем ответ от ИИ
    const context = getContextForAPI();
    const aiResponse = await API.callDeepSeek(message, state.currentScenario, context);
    
    // Удаляем сообщение с загрузкой
    loadingMessage.remove();
    
    // Добавляем ответ
    addMessage('ai', aiResponse, 'ИИ-симулятор');
    
    saveConfig();
}

// Получение контекста для API
function getContextForAPI() {
    const lastActions = state.userActions
        .filter(action => action.scenario === state.currentScenario)
        .slice(-3)
        .map(action => action.action)
        .join('; ');
        
    return `Предыдущие действия пользователя: ${lastActions || 'нет'}. Текущий сценарий: ${getScenarioName(state.currentScenario)}.`;
}

// Анализ действий пользователя
async function analyzeUserActions() {
    if (state.userActions.length === 0) {
        addMessage('ai', 'Вы еще не выполнили никаких действий в этом сценарии. Пожалуйста, опишите ваши действия для анализа.', 'ИИ-инструктор');
        return;
    }
    
    const actionsText = state.userActions
        .filter(action => action.scenario === state.currentScenario)
        .map((action, index) => `${index + 1}. ${action.action}`)
        .join('\n');
    
    // Показываем индикатор загрузки
    const loadingMessage = addMessage('ai', '<div class="loading"></div> Анализирую ваши действия...', 'ИИ-инструктор');
    
    // Получаем анализ от ИИ
    const analysis = await API.analyzeActions(actionsText, state.currentScenario);
    
    // Удаляем сообщение с загрузкой
    loadingMessage.remove();
    
    // Обновляем прогресс
    state.progress = Math.min(state.progress + 5, 100);
    updateUI();
    
    // Добавляем анализ
    addMessage('ai', `<strong>Анализ ваших действий:</strong><br><br>${analysis}`, 'ИИ-инструктор');
    
    saveConfig();
}

// Показать подсказку
function showHint() {
    let hint = '';
    
    switch(state.currentScenario) {
        case 'unconscious':
            hint = 'Алгоритм при отсутствии сознания: 1) Обеспечьте безопасность, 2) Проверьте реакцию, 3) Вызовите скорую (112), 4) Проверьте дыхание (10 секунд), 5) При наличии дыхания - стабильное боковое положение, 6) При отсутствии дыхания - начните СЛР';
            break;
        case 'cpr':
            hint = 'Алгоритм СЛР: 1) Вызовите скорую, 2) Откройте дыхательные пути, 3) Проверьте дыхание, 4) 30 компрессий на центр грудной клетки (глубина 5-6 см), 5) 2 искусственных вдоха, 6) Продолжайте циклы 30:2';
            break;
        case 'bleeding':
            hint = 'При артериальном кровотечении: прямое давление на рану → жгут выше раны → давящая повязка. Запишите время наложения жгута!';
            break;
        case 'fracture':
            hint = 'Иммобилизация: зафиксировать суставы выше и ниже перелома, не вправлять кости, при открытом переломе - остановить кровотечение';
            break;
        case 'burn':
            hint = 'Охлаждение водой 10-15 минут → стерильная повязка → при сильной боли обезболивающее. Не прокалывайте пузыри!';
            break;
        case 'caxap':
            hint = 'При гипогликемии: дать сладкое (сок, конфету), при потере сознания - вызвать скорую, не вводить инсулин!';
            break;
        case 'legal':
            hint = 'Юридические аспекты: 1) Оказание первой помощи - право, а не обязанность, 2) Несете ответственность только за умышленный вред, 3) Медики обязаны оказывать помощь на работе, 4) Используйте средства индивидуальной защиты';
            break;
        default:
            hint = 'Используйте универсальный алгоритм: безопасность, оценка сознания, вызов помощи, оценка дыхания, остановка кровотечения, иммобилизация, поддержание функций';
    }
    
    addMessage('ai', `<strong>Подсказка:</strong> ${hint}`, 'ИИ-инструктор');
}

// Сброс сценария
function resetScenario() {
    loadScenario(state.currentScenario);
}

// Обновление отображения ошибок
function updateErrorDisplay() {
    const errorAnalysis = document.getElementById('error-analysis');
    
    if (!errorAnalysis) return;
    
    if (state.errors.length === 0) {
        errorAnalysis.innerHTML = `
            <h4><i class="fas fa-exclamation-triangle"></i> Анализ ошибок</h4>
            <p>Здесь будут отображаться ошибки, допущенные в симуляциях. Пока ошибок не обнаружено.</p>
        `;
        return;
    }
    
    let errorsByScenario = {};
    state.errors.forEach(error => {
        if (!errorsByScenario[error.scenario]) {
            errorsByScenario[error.scenario] = [];
        }
        errorsByScenario[error.scenario].push(error.error);
    });
    
    let errorHTML = `<h4><i class="fas fa-exclamation-triangle"></i> Анализ ошибок (${state.errors.length} найдено)</h4>`;
    
    for (const [scenario, errors] of Object.entries(errorsByScenario)) {
        errorHTML += `<h5>${getScenarioName(scenario)}:</h5><ul>`;
        
        const uniqueErrors = [...new Set(errors)];
        uniqueErrors.forEach(error => {
            errorHTML += `<li class="error-item">${error}</li>`;
        });
        
        errorHTML += `</ul>`;
    }
    
    errorAnalysis.innerHTML = errorHTML;
}

// Проверка теста
function checkTest() {
    const questions = document.querySelectorAll('.test-question');
    let correctCount = 0;
    let totalQuestions = 0;
    
    questions.forEach((question) => {
        totalQuestions++;
        const options = question.querySelectorAll('.test-option');
        let hasSelected = false;
        
        options.forEach(option => {
            if (option.classList.contains('selected')) {
                hasSelected = true;
                if (option.dataset.correct === 'true') {
                    correctCount++;
                    option.classList.add('correct');
                } else {
                    option.classList.add('incorrect');
                }
            }
            
            // Показать правильные ответы
            if (option.dataset.correct === 'true') {
                option.classList.add('correct');
            }
        });
        
        // Если не выбрали ответ
        if (!hasSelected) {
            options.forEach(option => {
                if (option.dataset.correct === 'true') {
                    option.classList.add('correct');
                }
            });
        }
        
        // Запретить дальнейшие выборы
        options.forEach(option => {
            option.style.pointerEvents = 'none';
        });
    });
    
    // Показать результат
    const resultMessage = `Вы ответили правильно на ${correctCount} из ${totalQuestions} вопросов.`;
    addMessage('ai', `<strong>Результат теста:</strong> ${resultMessage} ${correctCount === totalQuestions ? 'Отличный результат!' : 'Рекомендуется повторить теоретический материал.'}`, 'ИИ-инструктор');
    
    // Обновить прогресс
    if (correctCount > 0) {
        state.progress = Math.min(state.progress + (correctCount * 2), 100);
        updateUI();
        saveConfig();
    }
}

// Проверка юридических кейсов
function checkLegalCases() {
    const scenarios = document.querySelectorAll('.legal-scenario');
    
    scenarios.forEach(scenario => {
        const options = scenario.querySelectorAll('.test-option');
        options.forEach(option => {
            if (option.dataset.legal === 'correct') {
                option.classList.add('correct');
            } else if (option.dataset.legal === 'incorrect') {
                option.classList.add('incorrect');
            } else if (option.dataset.legal === 'partial') {
                option.classList.add('partial');
                option.style.backgroundColor = '#fff3cd';
                option.style.borderColor = '#ffc107';
            }
            
            option.style.pointerEvents = 'none';
        });
    });
    
    addMessage('ai', '<strong>Юридические кейсы проверены.</strong> Правильные ответы выделены зеленым, частично правильные - желтым, неправильные - красным. Рекомендуется изучить теоретический материал по юридическим аспектам.', 'ИИ-инструктор');
}

// Функция прокрутки к юридическому разделу
function scrollToLegal() {
    const section = document.getElementById('legal-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Инициализация чата
function initChat() {
    if (state.apiKey && API.isAvailable()) {
        addMessage('ai', 'API ключ загружен. Выберите сценарий для начала тренировки. Я буду играть роль пострадавшего, а вы окажете мне первую помощь.', 'ИИ-симулятор');
    } else {
        addMessage('ai', 'API ключ DeepSeek уже встроен в приложение. Выберите сценарий для начала тренировки. Я буду играть роль пострадавшего, а вы окажете мне первую помощь.', 'ИИ-симулятор');
    }
    
    loadScenario(state.currentScenario);
}

// Инициализация обработчиков событий
function initEventListeners() {
    // Отправка сообщения
    if (sendBtn) {
        sendBtn.addEventListener('click', sendUserMessage);
    }
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendUserMessage();
        });
    }
    
    // Анализ действий
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeUserActions);
    }
    
    // Сброс сценария
    if (resetBtn) {
        resetBtn.addEventListener('click', resetScenario);
    }
    
    // Подсказка
    if (hintBtn) {
        hintBtn.addEventListener('click', showHint);
    }
    
    // Выбор сценария
    scenarioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            loadScenario(btn.dataset.scenario);
        });
    });
    
    // Переключение вкладок
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Обновляем активную вкладку
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Показываем соответствующий контент
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Переключение режима API
    if (useRealAPICheckbox) {
        useRealAPICheckbox.addEventListener('change', () => {
            state.useRealAPI = useRealAPICheckbox.checked;
            saveConfig();
            updateUI();
        });
    }
    
    // Настройки интерфейса
    const autoScrollCheckbox = document.getElementById('auto-scroll');
    if (autoScrollCheckbox) {
        autoScrollCheckbox.addEventListener('change', (e) => {
            state.config.autoScroll = e.target.checked;
            saveConfig();
        });
    }
    
    const soundEffectsCheckbox = document.getElementById('sound-effects');
    if (soundEffectsCheckbox) {
        soundEffectsCheckbox.addEventListener('change', (e) => {
            state.config.soundEffects = e.target.checked;
            saveConfig();
        });
    }
    
    // Обработчики для тестов
    const checkTestBtn = document.getElementById('check-test');
    if (checkTestBtn) {
        checkTestBtn.addEventListener('click', checkTest);
    }
    
    const checkLegalBtn = document.getElementById('check-legal');
    if (checkLegalBtn) {
        checkLegalBtn.addEventListener('click', checkLegalCases);
    }
    
    // Выбор вариантов в тесте
    const testOptions = document.querySelectorAll('.test-option');
    testOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Снимаем выделение с других вариантов в этом вопросе
            const parentQuestion = option.closest('.test-question, .legal-scenario');
            if (parentQuestion) {
                const siblingOptions = parentQuestion.querySelectorAll('.test-option');
                siblingOptions.forEach(opt => opt.classList.remove('selected'));
            }
            
            // Выделяем выбранный вариант
            option.classList.add('selected');
        });
    });
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);