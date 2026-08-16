const THAI_TIME_ZONE = 'Asia/Bangkok';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: THAI_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: THAI_TIME_ZONE,
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
});

const yearFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: THAI_TIME_ZONE,
    year: 'numeric'
});

const parsePositiveInt = (value, fieldName) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed)) {
        throw new Error(`${fieldName} is invalid`);
    }
    return parsed;
};

const getBangkokDateParts = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const parts = dateFormatter.formatToParts(date).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {});

    return {
        day: parts.day,
        month: parts.month,
        yearAD: Number.parseInt(parts.year, 10),
        yearBE: Number.parseInt(parts.year, 10) + 543
    };
};

const formatBangkokDate = (value, separator = '-') => {
    const parts = getBangkokDateParts(value);
    if (!parts) return null;
    return `${parts.day}${separator}${parts.month}${separator}${parts.yearBE}`;
};

const formatBangkokDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const parts = dateTimeFormatter.formatToParts(date).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {});
    const yearBE = Number.parseInt(parts.year, 10) + 543;

    return `${parts.day}/${parts.month}/${yearBE} ${parts.hour}:${parts.minute}:${parts.second}`;
};

const createBangkokDate = (yearAD, month, day) => {
    const date = new Date(Date.UTC(yearAD, month - 1, day, -7, 0, 0, 0));
    const parts = getBangkokDateParts(date);

    if (!parts || parts.yearAD !== yearAD || Number(parts.month) !== month || Number(parts.day) !== day) {
        throw new Error('Invalid Bangkok date');
    }

    return date;
};

const parseThaiDateString = (dateString) => {
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateString || '');
    if (!match) {
        throw new Error('Invalid Thai date format');
    }

    const day = parsePositiveInt(match[1], 'day');
    const month = parsePositiveInt(match[2], 'month');
    const yearAD = parsePositiveInt(match[3], 'year') - 543;

    return createBangkokDate(yearAD, month, day);
};

const parseISODateStringAsBangkokDate = (dateString) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString || '');
    if (!match) {
        throw new Error('Invalid ISO date format');
    }

    const yearAD = parsePositiveInt(match[1], 'year');
    const month = parsePositiveInt(match[2], 'month');
    const day = parsePositiveInt(match[3], 'day');

    return createBangkokDate(yearAD, month, day);
};

const getCurrentBangkokYear = () => {
    return Number.parseInt(yearFormatter.format(new Date()), 10);
};

const getBangkokYearRange = (yearAD) => ({
    start: createBangkokDate(yearAD, 1, 1),
    end: createBangkokDate(yearAD + 1, 1, 1)
});

module.exports = {
    THAI_TIME_ZONE,
    formatBangkokDate,
    formatBangkokDateTime,
    parseThaiDateString,
    parseISODateStringAsBangkokDate,
    getCurrentBangkokYear,
    getBangkokYearRange
};
