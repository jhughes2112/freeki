using System.Threading.Tasks;
using ReachableGames.RGWebSocket;
using System.Net;
using Logging;

namespace Networking
{
	// Whenever there's a new connection or a disconnection or indeed ANY message received, they all come through this object regardless of what websocket originates it.
	// ConnectionManagerReject, as a policy, rejects all connections.  Raw-mode construction (no IMessageFactory) since no messages are ever accepted.
	public class ConnectionManagerReject : RGConnectionManager
	{
		public ConnectionManagerReject(ILogging logger) : base(logger)
		{
		}

		public override async Task OnConnection(RGWebSocket rgws, HttpListenerContext httpListenerContext)
		{
			_logger.Log(EVerbosity.Info, $"OnConnection called\" RGWSID={rgws.DisplayId}");
			await rgws.Shutdown().ConfigureAwait(false);
		}

		public override Task OnDisconnect(RGWebSocket rgws)
		{
			return Task.CompletedTask;
		}

		public override Task OnMessage(RGWebSocket rgws, IRGMessage msg)
		{
			return Task.CompletedTask;  // never reached: connections are shut down before the pumps start
		}

		public override Task Shutdown()
		{
			return Task.CompletedTask;
		}
	}
}
