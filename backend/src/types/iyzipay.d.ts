declare module 'iyzipay' {
  interface IyzipayOptions {
    apiKey: string;
    secretKey: string;
    uri: string;
  }

  interface IyzipayCallback<T> {
    (err: any, result: T): void;
  }

  class Iyzipay {
    static BASKET_ITEM_TYPE: {
      PHYSICAL: string;
      VIRTUAL: string;
    };
    static LOCALE: {
      TR: string;
      EN: string;
    };
    static CURRENCY: {
      TRY: string;
      EUR: string;
      USD: string;
      GBP: string;
    };

    constructor(options: IyzipayOptions);

    checkoutFormInitialize: {
      create(request: any, callback: IyzipayCallback<any>): void;
    };
    checkoutFormRetrieve: {
      retrieve(request: any, callback: IyzipayCallback<any>): void;
    };
    payment: {
      create(request: any, callback: IyzipayCallback<any>): void;
    };
  }

  export = Iyzipay;
}
