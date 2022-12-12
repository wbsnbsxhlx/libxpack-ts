function lenByte(n:number):number{
	var ret = 0;
	if (n > 0xffffffff) {
		n >>= 32;
		ret += 4;
	}
	if (n > 0xffff) {
		n >>= 16;
		ret += 2;
	}
	if (n > 0xff) {
		n >>= 8;
		ret += 1;
	}
	if (n > 0){
		ret += 1;
	}

    return ret;
}

export class Xpack {
    static getPacker(buf?:Uint8Array):Xpack{
        var ret = new Xpack(buf);
        return ret;
    }
    
    private _buffer!:Uint8Array;
    private _view!:DataView;
    private _offset!:number;
    
    constructor(buf?:Uint8Array){
        if(buf == null){
            this._buffer = new Uint8Array(128);
        }else{
            this._buffer = buf;
        }
        this._view = new DataView(this._buffer.buffer, this._buffer.byteOffset)
        this._offset = 0;
    }

    private checkMemery(num:number){
        const needSize = this._offset + num;

        if (needSize > this._buffer.length)
        {
            const newLength = Math.max(this._buffer.length + (this._buffer.length >> 1), needSize);
            const newBuffer = new Uint8Array(newLength);
            newBuffer.set(this._buffer);

            this._buffer = newBuffer;
            this._view = new DataView(newBuffer.buffer);
        }
    }

    Bytes():Uint8Array{
        return this._buffer.slice(0, this._offset);
    }

    packUint(n:number){
        this.checkMemery(9);
        if(n <= 0x7f){
            this._view.setUint8(this._offset++, n);
            return;
        }

        var len = lenByte(n);
        this._view.setUint8(this._offset++, 0xff-len+1);
        for(let i = len-1; i >= 0; i--){
            this._view.setUint8(this._offset++, n>>(i*8)&0xff);
        }
    }

    packInt(n:number){
        var x = 0;
        if (n < 0) {
            x = (~n << 1) | 1;
        } else {
            x = (n << 1);
        }
    
        this.packUint(x);
    }

    packFloat(n:number){
        var buffer = new Uint8Array(8);
        var view = new DataView(buffer.buffer);
        view.setFloat64(0, n);
        buffer.reverse();
        var offset = 0;
        var isBegin = false;
        for(let i = 0; i < 8; i++){
            var x = view.getUint8(offset+i);
            if(x > 0 || isBegin){
                if(!isBegin) this._view.setUint8(this._offset++, 0xff-7+i);
                isBegin = true;
                this._view.setUint8(this._offset++, x);
            }
        }
    }

    packRaw(value: Uint8Array) {
        this.checkMemery(value.length + 1);
        this.packUint(value.length);

        this._buffer.set(value, this._offset);
        this._offset += value.length;
    }

    unpackUint():number{
        var n = this._view.getUint8(this._offset++);
        if(n <= 0x7f){
            return n;
        }
        
        n = 0xff - n + 1;
        
        let ret = 0;
        for (let i = 0; i < n; i++) {
            var b = this._view.getUint8(this._offset++);
            ret = ret*2**8 + b;
        }
        return ret;
    }

    unpackInt():number{
        var ret = this.unpackUint();
        if ((ret&1) != 0) {
            return ~(ret / 2);
        }
        return ret / 2;
    }

    unpackFloat():number{
        var buffer = new Uint8Array(8);
        var view = new DataView(buffer.buffer);
        var offset = 0;
        
        var n = this._view.getUint8(this._offset++);
        n = 0x100 - n;

        for(let i = 0; i < n; i++){
            view.setUint8(offset+n-i-1, this._view.getUint8(this._offset++));
        }

        return view.getFloat64(0);
    }

    unpackRaw(): Uint8Array{
        var n = this.unpackUint();
        this._offset += n;
        return this._buffer.slice(this._offset-n, this._offset);
    }
}