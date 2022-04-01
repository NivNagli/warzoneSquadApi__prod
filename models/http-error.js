/* This model will warp the Error object from javascript, we will use it to ease the error transition between the server side to the client side. */

class HttpError extends Error {
    constructor(message, errorCode) {
      super(message);
      this.code = errorCode;
    }
  }
  
  module.exports = HttpError;
  