// Конфигурация приложения
const CONFIG = {
    DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',
    // ВСТРОЕННЫЙ API КЛЮЧ - пользователю не нужно вводить
    DEEPSEEK_API_KEY: 'sk-f99ec8dddd554921bc2f53f20c04ceca',
    STORAGE_KEY: 'first_aid_trainer_config',
    VERSION: '1.0.0'
};

// Названия сценариев
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