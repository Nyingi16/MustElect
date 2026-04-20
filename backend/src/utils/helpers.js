const crypto = require('crypto');

class Helpers {
  generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  generateOTP(length = 6) {
    return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
  }

  formatDate(date, format = 'ISO') {
    const d = new Date(date);
    if (format === 'ISO') return d.toISOString();
    if (format === 'locale') return d.toLocaleString();
    if (format === 'date') return d.toLocaleDateString();
    if (format === 'time') return d.toLocaleTimeString();
    return d.toString();
  }

  calculateVoterTurnout(totalVoters, totalVotes) {
    if (totalVoters === 0) return 0;
    return ((totalVotes / totalVoters) * 100).toFixed(2);
  }

  maskEmail(email) {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local.charAt(0)}***@${domain}`;
    return `${local.substring(0, 2)}${'*'.repeat(local.length - 2)}@${domain}`;
  }

  maskRegistrationNumber(regNumber) {
    if (regNumber.length <= 4) return regNumber;
    return `${regNumber.substring(0, 3)}${'*'.repeat(regNumber.length - 3)}`;
  }

  truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  isValidWalletAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/i.test(address);
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  isValidRegistrationNumber(regNumber) {
    return /^[A-Z0-9]{4,20}$/i.test(regNumber);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  retry(fn, retries = 3, delay = 1000) {
    return new Promise((resolve, reject) => {
      fn().then(resolve).catch(error => {
        if (retries === 0) reject(error);
        else setTimeout(() => this.retry(fn, retries - 1, delay).then(resolve).catch(reject), delay);
      });
    });
  }

  groupBy(array, key) {
    return array.reduce((result, item) => {
      const groupKey = item[key];
      if (!result[groupKey]) result[groupKey] = [];
      result[groupKey].push(item);
      return result;
    }, {});
  }

  paginate(data, page = 1, limit = 20) {
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      data: data.slice(start, end),
      total: data.length,
      page,
      totalPages: Math.ceil(data.length / limit),
      hasNext: end < data.length,
      hasPrev: page > 1
    };
  }

  generateHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  verifyHash(data, hash) {
    return this.generateHash(data) === hash;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getPaginationOptions(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
  }
}

module.exports = new Helpers();