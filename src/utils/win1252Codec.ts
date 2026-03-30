// 自定义 Windows-1252 编解码器（完全无依赖）
export class Win1252Codec {
  // Windows-1252 → Unicode 映射
   static win1252ToUnicode: Record<number, number> = {
      128: 8364, 130: 8218, 131: 402,  132: 8222, 133: 8230,
      134: 8224, 135: 8225, 136: 710,  137: 8240, 138: 352,
      139: 8249, 140: 338,  142: 381,  145: 8216, 146: 8217,
      147: 8220, 148: 8221, 149: 8226, 150: 8211, 151: 8212,
      152: 732,  153: 8482, 154: 353,  155: 8250, 156: 339,
      158: 382,  159: 376
  };

  // Unicode → Windows-1252 映射
 static unicodeToWin1252: Record<number, number> = (() => {
      const map: Record<number, number> = {};
      Object.entries(Win1252Codec.win1252ToUnicode).forEach(([win1252, unicode]) => {
          map[unicode] = Number(win1252);
      });
      return map;
  })();

  /**
   * 将字符串编码为 Windows-1252 字节数组
   */
  static encode(str: string): number[] {
      const bytes: number[] = [];
      
      for (let i = 0; i < str.length; i++) {
          const code = str.charCodeAt(i);
          
          if (code <= 0x7F) {
              // ASCII
              bytes.push(code);
          } else if (this.unicodeToWin1252[code] !== undefined) {
              // Windows-1252 特殊字符
              bytes.push(this.unicodeToWin1252[code]);
          } else if (code <= 0xFF) {
              // 普通 Latin-1 字符
              bytes.push(code);
          } else {
              // 无法映射的字符，用 '?' 替换
              console.warn(`警告: 无法映射字符 U+${code.toString(16)}，使用 '?' 替换`);
              bytes.push(0x3F);
          }
      }
      
      return bytes;
  }

  /**
   * 将 Windows-1252 字节数组解码为字符串
   */
  static decode(bytes: number[]): string {
      let result = '';
      
      for (let i = 0; i < bytes.length; i++) {
          const byte = bytes[i];
          
          if (byte <= 0x7F) {
              // ASCII
              result += String.fromCharCode(byte);
          } else if (this.win1252ToUnicode[byte] !== undefined) {
              // Windows-1252 特殊字符
              result += String.fromCharCode(this.win1252ToUnicode[byte]);
          } else {
              // 普通 Latin-1 字符
              result += String.fromCharCode(byte);
          }
      }
      
      return result;
  }
}

// // 使用
// const text = "pl7v>¡˜O";
// const bytes = Win1252Codec.encode(text);
// console.log(bytes); // [112, 108, 55, 118, 62, 161, 152, 79]

// const decoded = Win1252Codec.decode(bytes);
// console.log(decoded); // "pl7v>¡˜O"
// console.log(decoded.charCodeAt(6)); // 732 (˜的Unicode码点)