using System;
using System.Collections.Generic;

namespace FreeKi
{
	// Command-line options for the server.  Hand-rolled parser (no reflection) so it works under native AOT.
	// Accepts --name value and --name=value forms.  --help/-h prints usage and returns null.
	public class FreeKiOptions
	{
		public string? log_config       { get; set; } = "console,2";
		public string? conn_bindurl     { get; set; } = "http://+:7777/";
		public string? storage_config   { get; set; } = null;  // required
		public string? auth_config      { get; set; } = "always";
		public string? advertise_urls   { get; set; } = "http://localhost:7777/";
		public string? static_root      { get; set; } = "../static-root";
		public string? gitremote_config { get; set; } = "";

		// (name, required, help)
		static private readonly (string name, bool required, string help)[] kOptions = new (string, bool, string)[]
		{
			("log_config",       false, "Must be: console,# or file,#,/path/file.log where [0=Errors, 1=Warnings, 2=Info, 3=Debug, 4=Extreme]"),
			("conn_bindurl",     false, "This is the URL we actually bind to. /health and /metrics for hosting and prometheus."),
			("storage_config",   true,  "Root of dynamic storage, ex: /data/"),
			("auth_config",      false, "Authentication: always or openid,http://localhost:4205/.well-known/openid-configuration"),
			("advertise_urls",   false, "Comma-separated list of URLs that requests should look like to the server. Example: 'http://localhost:7777/,https://example.com:8080/wiki/'"),
			("static_root",      false, "Path to the static client files. Can be relative to the executable or an absolute path."),
			("gitremote_config", false, "Git remote configuration: 'remote_url,username,password,branch' or 'remote_url,,,branch' for no auth. Example: '/mnt/local/remote,,,main'"),
		};

		// Returns parsed options, or null if parsing failed or help was requested (usage/errors go to the console).
		static public FreeKiOptions? Parse(string[] args)
		{
			FreeKiOptions options = new FreeKiOptions();
			Dictionary<string, string> values = new Dictionary<string, string>(StringComparer.Ordinal);

			for (int i = 0; i < args.Length; i++)
			{
				string arg = args[i];
				if (arg == "--help" || arg == "-h")
				{
					PrintHelp();
					return null;
				}
				if (arg.StartsWith("--", StringComparison.Ordinal) == false)
				{
					Console.WriteLine($"Unexpected argument: {arg}");
					PrintHelp();
					return null;
				}

				string name = arg.Substring(2);
				string? value = null;
				int equals = name.IndexOf('=');
				if (equals >= 0)  // --name=value
				{
					value = name.Substring(equals + 1);
					name = name.Substring(0, equals);
				}
				else if (i + 1 < args.Length)  // --name value
				{
					value = args[++i];
				}

				bool known = false;
				foreach ((string optName, bool _, string _) in kOptions)
					known |= optName == name;
				if (known == false)
				{
					Console.WriteLine($"Unknown option: --{name}");
					PrintHelp();
					return null;
				}
				if (value == null)
				{
					Console.WriteLine($"Missing value for option: --{name}");
					PrintHelp();
					return null;
				}
				values[name] = value;
			}

			// Check required options are present.
			foreach ((string name, bool required, string _) in kOptions)
			{
				if (required && values.ContainsKey(name) == false)
				{
					Console.WriteLine($"Required option missing: --{name}");
					PrintHelp();
					return null;
				}
			}

			if (values.TryGetValue("log_config",       out string? v)) options.log_config       = v;
			if (values.TryGetValue("conn_bindurl",     out v))         options.conn_bindurl     = v;
			if (values.TryGetValue("storage_config",   out v))         options.storage_config   = v;
			if (values.TryGetValue("auth_config",      out v))         options.auth_config      = v;
			if (values.TryGetValue("advertise_urls",   out v))         options.advertise_urls   = v;
			if (values.TryGetValue("static_root",      out v))         options.static_root      = v;
			if (values.TryGetValue("gitremote_config", out v))         options.gitremote_config = v;
			return options;
		}

		static private void PrintHelp()
		{
			FreeKiOptions defaults = new FreeKiOptions();
			Console.WriteLine("FreeKi server options:");
			foreach ((string name, bool required, string help) in kOptions)
			{
				string requiredText = required ? " (Required)" : "";
				Console.WriteLine($"  --{name,-18}{requiredText} {help}");
			}
			Console.WriteLine($"Defaults: --log_config {defaults.log_config} --conn_bindurl {defaults.conn_bindurl} --auth_config {defaults.auth_config} --advertise_urls {defaults.advertise_urls} --static_root {defaults.static_root}");
		}
	}
}
