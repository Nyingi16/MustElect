const { create } = require('ipfs-http-client');
const dotenv = require('dotenv');

dotenv.config();

class IPFSService {
  constructor() {
    this.ipfs = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      this.ipfs = create({
        host: process.env.IPFS_HOST || 'localhost',
        port: parseInt(process.env.IPFS_PORT) || 5001,
        protocol: process.env.IPFS_PROTOCOL || 'http'
      });
      
      // Test connection
      const id = await this.ipfs.id();
      console.log(`IPFS node connected: ${id.id}`);
      this.initialized = true;
    } catch (error) {
      console.warn('IPFS service not available:', error.message);
      this.initialized = false;
    }
  }

  async uploadToIPFS(data, options = {}) {
    await this.initialize();
    
    if (!this.initialized) {
      console.log('[MOCK] IPFS upload - would upload:', data.length);
      return `Qm${Math.random().toString(36).substring(2, 46)}`;
    }
    
    try {
      const result = await this.ipfs.add(data, {
        pin: options.pin !== false,
        ...options
      });
      
      return result.path;
    } catch (error) {
      console.error('IPFS upload failed:', error);
      throw error;
    }
  }

  async downloadFromIPFS(cid) {
    await this.initialize();
    
    if (!this.initialized) {
      throw new Error('IPFS service not available');
    }
    
    const chunks = [];
    for await (const chunk of this.ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }

  async pinFile(cid) {
    await this.initialize();
    
    if (!this.initialized) {
      return { success: false, message: 'IPFS not available' };
    }
    
    try {
      const result = await this.ipfs.pin.add(cid);
      return { success: true, cid: result };
    } catch (error) {
      console.error('IPFS pin failed:', error);
      return { success: false, error: error.message };
    }
  }

  async unpinFile(cid) {
    await this.initialize();
    
    if (!this.initialized) {
      return { success: false };
    }
    
    try {
      await this.ipfs.pin.rm(cid);
      return { success: true };
    } catch (error) {
      console.error('IPFS unpin failed:', error);
      return { success: false };
    }
  }

  async getFileInfo(cid) {
    await this.initialize();
    
    if (!this.initialized) {
      return null;
    }
    
    try {
      const stats = await this.ipfs.files.stat(`/ipfs/${cid}`);
      return {
        cid,
        size: stats.size,
        cumulativeSize: stats.cumulativeSize,
        type: stats.type
      };
    } catch (error) {
      console.error('IPFS stat failed:', error);
      return null;
    }
  }
}

module.exports = new IPFSService();