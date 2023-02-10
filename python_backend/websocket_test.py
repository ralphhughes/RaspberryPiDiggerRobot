import tornado.web, tornado.ioloop, tornado.websocket 
import io, os, socket

serverPort = 1337




class wsHandler(tornado.websocket.WebSocketHandler):
	connections = []

	def open(self):
		self.connections.append(self)
		print("Connection opened")

	def on_close(self):
		self.connections.remove(self)
		print("connection closed")

	def on_message(self, message):
		print("Message: ", message)

	@classmethod
	def hasConnections(cl):
		if len(cl.connections) == 0:
			return False
		return True

	@classmethod
	async def broadcast(cl, message):
		for connection in cl.connections:
			try:
				await connection.write_message(message, True)
			except tornado.websocket.WebSocketClosedError:
				pass
			except tornado.iostream.StreamClosedError:
				pass

	def check_origin(self, origin):
		return True




requestHandlers = [
	(r"/", wsHandler),
	(r"/ws/", wsHandler),
	(r"/websockets/", wsHandler)
]

try:
	application = tornado.web.Application(requestHandlers)
	application.listen(serverPort)
	loop = tornado.ioloop.IOLoop.current()
	print("Starting websocket server")
	loop.start()
	print("never executes?")
except KeyboardInterrupt:
	loop.stop()
	print("Stopped web socket server")
