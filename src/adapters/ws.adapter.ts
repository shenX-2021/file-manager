import { WsAdapter as OriginWsAdapter } from '@nestjs/platform-ws';
import { CLOSE_EVENT } from '@nestjs/websockets/constants';
import { MessageMappingProperties } from '@nestjs/websockets/gateway-metadata-explorer';
import { EMPTY, fromEvent, Observable } from 'rxjs';
import { filter, first, mergeMap, share, takeUntil } from 'rxjs/operators';
import { Ws } from '../typings/ws';

enum READY_STATE {
  CONNECTING_STATE = 0,
  OPEN_STATE = 1,
  CLOSING_STATE = 2,
  CLOSED_STATE = 3,
}

export class WsAdapter extends OriginWsAdapter {
  public bindMessageHandlers(
    client: Ws.Websocket,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
    const close$ = fromEvent(client, CLOSE_EVENT).pipe(share(), first());
    const source$ = fromEvent(client, 'message').pipe(
      mergeMap((data: any) => {
        try {
          const message = data.data;
          const messageHandler = handlers[0];

          if (!messageHandler) {
            // 缺少处理函数，则不做任何处理
            return EMPTY;
          } else if (!client.isAuth) {
            // 缺少account属性，则表示鉴权
            return Promise.resolve({
              code: 10003,
              error: '鉴权完成之前无法发送数据',
            });
          }
          return this.customBindMessageHandler(
            message,
            messageHandler,
            transform,
          ).pipe(filter((result) => result));
        } catch (e) {
          console.error('websocket参数:', data.data && data.data.toString());
          console.error('websocket处理数据报错:', e);
          return EMPTY;
        }
      }),
      takeUntil(close$),
    );
    const onMessage = (response: any) => {
      if (client.readyState !== READY_STATE.OPEN_STATE) {
        return;
      }
      client.sendJson(response);
    };
    source$.subscribe({
      next: onMessage,
    });
  }

  public customBindMessageHandler(
    message: unknown,
    messageHandler: MessageMappingProperties,
    transform: (data: any) => Observable<any>,
  ): Observable<any> {
    const { callback } = messageHandler;

    return transform(callback(message));
  }
}
