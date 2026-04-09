// Функция для очистки markdown-разметки
function cleanMarkdown(text) {
    let cleaned = text;
    
    // Удаляем заголовки (### Заголовок → Заголовок)
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
    
    // Удаляем жирный текст (**жирный** → жирный)
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // Удаляем курсив (*курсив* → курсив)
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
    
    // Удаляем подчеркивания (__текст__ → текст)
    cleaned = cleaned.replace(/__(.*?)__/g, '$1');
    cleaned = cleaned.replace(/_(.*?)_/g, '$1');
    
    // Преобразуем маркеры списков в красивые символы
    cleaned = cleaned.replace(/^[\-\*]\s+/gm, '• ');
    
    // Удаляем нумерованные списки (1. пункт → пункт)
    cleaned = cleaned.replace(/^\d+\.\s+/gm, '');
    
    // Удаляем блоки кода
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
    cleaned = cleaned.replace(/`(.*?)`/g, '$1');
    
    // Удаляем горизонтальные линии
    cleaned = cleaned.replace(/^---+$/gm, '');
    cleaned = cleaned.replace(/^\*{3,}$/gm, '');
    
    // Удаляем ссылки [текст](url) → текст
    cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    
    // Удаляем символы > в начале строк (цитаты)
    cleaned = cleaned.replace(/^>\s+/gm, '');
    
    // Удаляем лишние пробелы в начале строк
    cleaned = cleaned.replace(/^[ \t]+/gm, '');
    
    // Удаляем лишние пустые строки (больше 2 подряд)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Удаляем пробелы в конце строк
    cleaned = cleaned.replace(/[ \t]+$/gm, '');
    
    return cleaned.trim();
}

// API модуль для работы с DeepSeek
const API = {
    // Проверка доступности API
    isAvailable: function() {
        return !!(CONFIG.DEEPSEEK_API_KEY && CONFIG.DEEPSEEK_API_KEY.startsWith('sk-'));
    },
    
    // Получение системного промпта для сценария
    getSystemPromptForScenario: function(scenario) {
        const scenarios = {
            'unconscious': 'Ты - ИИ-симулятор пострадавшего в тренажере первой помощи. Ты симулируешь человека без сознания. Не реагируешь на оклики и прикосновения. Отвечай кратко, как будто ты пострадавший. После действий пользователя давай обратную связь. Отвечай на русском языке. НЕ используй markdown-разметку (звездочки, решетки, подчеркивания). Отвечай обычным текстом, без форматирования.',
            
            'cpr': 'Ты - ИИ-симулятор пострадавшего. Ты симулируешь человека без сознания и без дыхания. Грудная клетка не движется. Отвечай как пострадавший, описывай изменения состояния после действий пользователя. Отвечай на русском языке. НЕ используй markdown-разметку (звездочки, решетки, подчеркивания). Отвечай обычным текстом, без форматирования.',
            
            'bleeding': 'Ты - ИИ-симулятор пострадавшего. Ты симулируешь человека с сильным кровотечением. Отвечай как пострадавший, описывай свое состояние. Отвечай на русском языке. НЕ используй markdown-разметку (звездочки, решетки, подчеркивания). Отвечай обычным текстом, без форматирования.',
            
            'fracture': 'Ты - ИИ-симулятор пострадавшего. Ты симулируешь человека с переломом конечности. Отвечай как пострадавший, жалуйся на боль. Отвечай на русском языке. НЕ используй markdown-разметку (звездочки, решетки, подчеркивания). Отвечай обычным текстом, без форматирования.',
            
            'burn': 'Ты - ИИ-симулятор пострадавшего. Ты симулируешь человека с ожогом. Отвечай как пострадавший, описывай боль. Отвечай на русском языке. НЕ используй markdown-разметку (звездочки, решетки, подчеркивания). Отвечай обычным текстом, без форматирования.',
            
            'caxap': 'Ты - ИИ-симулятор пострадавшего. Ты симулируешь человека с гипогликемией. Отвечай как пострадавший с диабетом. Отвечай на русском языке. НЕ используй markdown-разметку (звездочки, решетки, подчеркивания). Отвечай обычным текстом, без форматирования.',
            
            'legal': 'Ты - эксперт по юридическим аспектам первой помощи. Отвечай на вопросы о правах, обязанностях и ответственности при оказании первой помощи. Ссылайся на статьи законов. Отвечай на русском языке. НЕ используй markdown-разметку (звездочки, решетки, подчеркивания). Отвечай обычным текстом, без форматирования. Для выделения используй ЗАГЛАВНЫЕ БУКВЫ.'
        };
        return scenarios[scenario] || 'Ты - ИИ-симулятор для тренировки первой помощи. Отвечай на русском языке. НЕ используй markdown-разметку (звездочки, решетки, подчеркивания). Отвечай обычным текстом, без форматирования.';
    },
    
    // Вызов DeepSeek API для симуляции пострадавшего
    callDeepSeek: async function(prompt, scenario, context = '') {
        if (!this.isAvailable()) {
            console.warn('API ключ не настроен, используется симуляция');
            return this.simulateResponse(prompt, scenario);
        }
        
        try {
            const systemPrompt = this.getSystemPromptForScenario(scenario);
            const fullContext = context ? `Контекст: ${context}\n\n` : '';
            
            const response = await fetch(CONFIG.DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: `${systemPrompt} ${fullContext} Отвечай кратко (1-3 предложения). Будь полезным и информативным.`
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                })
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка API: ${response.status}`);
            }
            
            const data = await response.json();
            let answer = data.choices[0].message.content;
            
            // Очищаем ответ от markdown-разметки
            answer = cleanMarkdown(answer);
            
            return answer;
        } catch (error) {
            console.error('DeepSeek API Error:', error);
            return this.simulateResponse(prompt, scenario);
        }
    },
    
    // Анализ действий пользователя через API
    analyzeActions: async function(actionsText, scenario) {
        if (!this.isAvailable()) {
            return this.simulateAnalysis(actionsText, scenario);
        }
        
        try {
            const analysisPrompt = `Проанализируй действия пользователя в сценарии "${getScenarioName(scenario)}". 
            
Действия пользователя:
${actionsText}

Найди ошибки, дай рекомендации по улучшению, оцени правильность алгоритма действий. 
Ответь на русском языке, структурированно, с выделением ошибок и рекомендаций.

ФОРМАТ ОТВЕТА (используй ТОЛЬКО этот формат, без звездочек и решеток):

ПРАВИЛЬНО:
[перечисли правильные действия пользователя через дефис]

ОШИБКИ:
[перечисли ошибки пользователя и объясни, как правильно]

РЕКОМЕНДАЦИИ:
[дай рекомендации по улучшению навыков]

ОЦЕНКА: [Отлично / Хорошо / Требует доработки / Опасно для жизни]

Важно: НЕ используй markdown-разметку. НЕ ставь звездочки. НЕ ставь решетки. Используй обычный текст.`;
            
            const response = await fetch(CONFIG.DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: 'Ты - опытный инструктор по первой помощи. Ты анализируешь действия обучающегося. Будь строгим, но доброжелательным. Отвечай на русском языке. НЕ используй markdown-разметку (звездочки, решетки, подчеркивания). Используй обычный текст и дефисы для списков.'
                        },
                        {
                            role: 'user',
                            content: analysisPrompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 800
                })
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка API: ${response.status}`);
            }
            
            const data = await response.json();
            let answer = data.choices[0].message.content;
            
            // Очищаем ответ от markdown-разметки
            answer = cleanMarkdown(answer);
            
            return answer;
        } catch (error) {
            console.error('Analysis API Error:', error);
            return this.simulateAnalysis(actionsText, scenario);
        }
    },
    
    // Симуляция ответа (резервный вариант при недоступности API)
    simulateResponse: function(userMessage, scenario) {
        let response = '';
        
        switch(scenario) {
            case 'unconscious':
                if (userMessage.toLowerCase().includes('провер') || userMessage.toLowerCase().includes('дыхан')) {
                    response = 'Я по-прежнему не дышу. Моя грудная клетка не движется. Что вы будете делать дальше?';
                } else if (userMessage.toLowerCase().includes('скор') || userMessage.toLowerCase().includes('112') || userMessage.toLowerCase().includes('вызв')) {
                    response = 'Скорая помощь вызвана. Что вы будете делать до их прибытия?';
                } else if (userMessage.toLowerCase().includes('положен') || userMessage.toLowerCase().includes('боков')) {
                    response = 'Вы придали мне стабильное боковое положение. Теперь мои дыхательные пути свободны. Что дальше?';
                } else {
                    response = 'Хорошо. Что вы будете делать дальше? Помните об алгоритме: безопасность, проверка сознания, вызов скорой, проверка дыхания.';
                }
                break;
                
            case 'cpr':
                if (userMessage.toLowerCase().includes('компресс') || userMessage.toLowerCase().includes('груд') || userMessage.toLowerCase().includes('нажим')) {
                    response = 'Вы начали компрессии грудной клетки. Делайте 30 компрессий, затем 2 искусственных вдоха. Продолжайте до прибытия помощи.';
                } else if (userMessage.toLowerCase().includes('вдох') || userMessage.toLowerCase().includes('дыхан')) {
                    response = 'Вы делаете искусственное дыхание. Не забывайте запрокидывать голову для открытия дыхательных путей.';
                } else {
                    response = 'Помните алгоритм СЛР: 30 компрессий на центр грудной клетки, затем 2 искусственных вдоха. Продолжайте циклами.';
                }
                break;
                
            case 'bleeding':
                if (userMessage.toLowerCase().includes('жгут')) {
                    response = 'Вы наложили жгут. Кровотечение остановилось. Не забудьте записать время наложения жгута!';
                } else if (userMessage.toLowerCase().includes('давящ') || userMessage.toLowerCase().includes('повязк')) {
                    response = 'Вы наложили давящую повязку. Кровь остановилась. Теперь нужно вызвать скорую.';
                } else {
                    response = 'У меня сильное кровотечение! Кровь ярко-красная, вытекает пульсирующей струей. Нужно срочно остановить кровотечение!';
                }
                break;
                
            case 'fracture':
                if (userMessage.toLowerCase().includes('шин') || userMessage.toLowerCase().includes('фиксац')) {
                    response = 'Вы зафиксировали мою ногу. Боль стала меньше. Спасибо!';
                } else if (userMessage.toLowerCase().includes('холод') || userMessage.toLowerCase().includes('лёд')) {
                    response = 'Холод помогает уменьшить отек и боль. Что дальше?';
                } else {
                    response = 'У меня очень болит нога! Она деформирована, я не могу ей пошевелить.';
                }
                break;
                
            case 'burn':
                if (userMessage.toLowerCase().includes('охлажд') || userMessage.toLowerCase().includes('вода')) {
                    response = 'Охлаждение помогает уменьшить боль. Что дальше?';
                } else if (userMessage.toLowerCase().includes('повязк')) {
                    response = 'Повязка наложена. Спасибо за помощь!';
                } else {
                    response = 'У меня сильный ожог! Очень больно!';
                }
                break;
                
            case 'caxap':
                if (userMessage.toLowerCase().includes('сладк') || userMessage.toLowerCase().includes('сок') || userMessage.toLowerCase().includes('конфет')) {
                    response = 'Спасибо, мне стало лучше. Я чувствую, что сахар поднимается.';
                } else {
                    response = 'Я чувствую слабость, головокружение. У меня диабет, наверное, упал сахар.';
                }
                break;
                
            case 'legal':
                if (userMessage.toLowerCase().includes('ответствен') || userMessage.toLowerCase().includes('виноват') || userMessage.toLowerCase().includes('накажут')) {
                    response = 'Согласно статье 31 ФЗ N 323, граждане, оказывающие первую помощь, не несут ответственности за неумышленное причинение вреда.';
                } else if (userMessage.toLowerCase().includes('право') || userMessage.toLowerCase().includes('обязан')) {
                    response = 'Оказание первой помощи - право гражданина, а не обязанность (за исключением отдельных категорий, например, медицинских работников при исполнении обязанностей).';
                } else if (userMessage.toLowerCase().includes('медик') || userMessage.toLowerCase().includes('врач')) {
                    response = 'Медицинские работники обязаны оказывать первую помощь при исполнении служебных обязанностей. Вне работы они имеют право, но не обязаны.';
                } else {
                    response = 'Вы можете задавать вопросы о правах, обязанностях и юридических аспектах оказания первой помощи.';
                }
                break;
                
            default:
                response = 'Продолжайте оказывать первую помощь. Опишите ваши следующие действия.';
        }
        
        return response;
    },
    
    // Симуляция анализа (резервный вариант)
    simulateAnalysis: function(actionsText, scenario) {
        return `Анализ ваших действий в сценарии "${getScenarioName(scenario)}"

ПРАВИЛЬНО:
- Вы правильно оценили ситуацию
- Вы вызвали скорую помощь

ОШИБКИ:
- Рекомендуется более детально следовать алгоритму первой помощи
- Важно помнить о собственной безопасности

РЕКОМЕНДАЦИИ:
- Повторите универсальный алгоритм оказания первой помощи
- Отработайте навыки на данном тренажере

ОЦЕНКА: Хорошо. Продолжайте тренироваться!`;
    },
    
    // Тестирование подключения к API
    testConnection: async function() {
        if (!this.isAvailable()) {
            return { success: false, message: 'API ключ не найден' };
        }
        
        try {
            const response = await fetch(CONFIG.DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'user',
                            content: 'Ответь "OK"'
                        }
                    ],
                    max_tokens: 5
                })
            });
            
            if (response.ok) {
                return { success: true, message: 'API подключен успешно!' };
            } else {
                return { success: false, message: `Ошибка API: ${response.status}` };
            }
        } catch (error) {
            return { success: false, message: `Ошибка подключения: ${error.message}` };
        }
    }
};