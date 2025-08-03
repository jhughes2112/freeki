using CommandLine;

namespace FreeKi
{
	public class FreeKiOptions
	{
		//-------------------
		// Logging
		[Option("log_config", Required = false, Default = "console,2", HelpText = "Must be: console,# or file,#,/path/file.log where [0=Errors, 1=Warnings, 2=Info, 3=Debug, 4=Extreme]")]
		public string? log_config { get; set; }

		//-------------------
		// Connection
		[Option("conn_bindurl", Required = false, Default = "http://+:7777/", HelpText = "This is the URL we actually bind to. /health and /metrics for hosting and prometheus.")]
		public string? conn_bindurl { get; set; }

        //-------------------
        // Storage - primarily for metadata, and it's always stored in .json format to make life simple.
        [Option("storage_config", Required = true, HelpText = "Root of dynamic storage, ex: /data/")]
		public string? storage_config { get; set; }

		//-------------------
		// Authentication
		[Option("auth_config", Required = false, Default = "always", HelpText = "Authentication: always or openid,http://localhost:4205/.well-known/openid-configuration")]
		public string? auth_config { get; set; }

		//-------------------
		// Static content and hosting
		[Option("advertise_urls", Required = false, Default = "http://localhost:7777/", HelpText = "Comma-separated list of URLs that requests should look like to the server. Example: 'http://localhost:7777/,https://example.com:8080/wiki/'")]
		public string? advertise_urls { get; set; }

		[Option("static_root", Required = false, Default = "../freeki-client", HelpText = "Path to the static client files. Can be relative to the executable or an absolute path.")]
		public string? static_root { get; set; }

		//-------------------
		// Git Configuration
		[Option("git_config", Required = false, Default = "../freeki-data", HelpText = "Git remote configuration: 'remote_url,username,password,branch' or 'remote_url,,,branch' for no auth. Example: '/mnt/local/remote,,,main'")]
		public string? git_config { get; set; }
	}
}
