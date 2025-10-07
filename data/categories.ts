import type { Category } from '../types';

// Image sources: unsplash.com

export const PART_OF_SPEECH_CATEGORIES: Category[] = [
    {
        id: 'nouns',
        name: 'Іменники',
        imageUrl: 'https://images.unsplash.com/photo-1511216335778-75a2e35c24eb?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100',
        color: 'rgba(100, 116, 139, 0.5)',
        textColor: '#f1f5f9'
    },
    {
        id: 'verbs',
        name: 'Дієслова',
        imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100',
        color: 'rgba(14, 165, 233, 0.5)',
        textColor: '#e0f2fe'
    },
    {
        id: 'adjectives',
        name: 'Прикметники',
        imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3a803a?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100',
        color: 'rgba(245, 158, 11, 0.5)',
        textColor: '#fffbeb'
    },
    {
        id: 'adverbs',
        name: 'Прислівники',
        imageUrl: 'https://images.unsplash.com/photo-1559526324-593bc0a3d586?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100',
        color: 'rgba(132, 204, 22, 0.5)',
        textColor: '#f7fee7'
    },
    {
        id: 'pronouns',
        name: 'Займенники',
        imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100',
        color: 'rgba(139, 92, 246, 0.5)',
        textColor: '#f5f3ff'
    },
    {
        id: 'prepositions',
        name: 'Прийменники',
        imageUrl: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100',
        color: 'rgba(20, 184, 166, 0.5)',
        textColor: '#f0fdfa'
    },
    {
        id: 'conjunctions',
        name: 'Сполучники',
        imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100',
        color: 'rgba(225, 29, 72, 0.5)',
        textColor: '#fff1f2'
    },
    {
        id: 'numerals',
        name: 'Числівники',
        imageUrl: 'https://images.unsplash.com/photo-1554224155-82a472179924?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100',
        color: 'rgba(113, 113, 122, 0.5)',
        textColor: '#f4f4f5'
    },
];

export const THEMATIC_CATEGORIES: Category[] = [
    {
        id: 'family-people',
        name: 'Сім\'я та люди',
        imageUrl: 'https://images.unsplash.com/photo-1558980830-454a8a5f357f?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100'
    },
    {
        id: 'food-drink',
        name: 'Їжа та напої',
        imageUrl: 'https://images.unsplash.com/photo-1550945772-974616143c05?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100'
    },
    {
        id: 'home',
        name: 'Дім',
        imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100'
    },
    {
        id: 'work-school',
        name: 'Робота та навчання',
        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100'
    },
    {
        id: 'leisure-hobbies',
        name: 'Дозвілля та хобі',
        imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963e?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100'
    },
    {
        id: 'nature-animals',
        name: 'Природа та тварини',
        imageUrl: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100'
    },
    {
        id: 'travel',
        name: 'Подорожі',
        imageUrl: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100'
    },
    {
        id: 'clothes',
        name: 'Одяг',
        imageUrl: 'https://images.unsplash.com/photo-1603252109360-778baaf1f2b6?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100'
    },
    {
        id: 'body-parts',
        name: 'Частини тіла',
        imageUrl: 'https://images.unsplash.com/photo-1579165466949-55816d80482d?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100'
    },
    {
        id: 'feelings-emotions',
        name: 'Почуття та емоції',
        imageUrl: 'https://images.unsplash.com/photo-1588232252199-880625b131e5?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100'
    },
];
