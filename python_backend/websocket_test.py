import tornado.web, tornado.ioloop, tornado.websocket 
import io, os, socket, asyncio

tornado.ioloop.IOLoop.configure("tornado.platform.asyncio.AsyncIOLoop")
io_loop = tornado.ioloop.IOLoop.current()
asyncio.set_event_loop(io_loop.asyncio_loop)

ws_port = 1337

clients = []


class WSHandler(tornado.websocket.WebSocketHandler):
	def open(self):
		print('new connection')
		clients.append(self)
	  
	def on_message(self, message):
		print('message received:  %s' % message)
		
		self.write_message("echo: " + message)
 
	def on_close(self):
		print('connection closed')
		clients.remove(self)
 
	def check_origin(self, origin):
		return True
 
application = tornado.web.Application([
	(r'/websockets', WSHandler)
])
 
if __name__ == "__main__":
	try:
		http_server = tornado.httpserver.HTTPServer(application)
		http_server.listen(ws_port)
		print("Starting websocket server")
		loop = tornado.ioloop.IOLoop.current()
		loop.start()
	except KeyboardInterrupt:
		loop.stop()
		print("\nStopped web socket server")