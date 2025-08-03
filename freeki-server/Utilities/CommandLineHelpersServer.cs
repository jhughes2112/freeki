using Authentication;
using DataCollection;
using Logging;
using Storage;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Cryptography;
using System.Threading.Tasks;

namespace Utilities
{
	static public class CommandLineHelpersServer
	{
		static public IDataCollection CreateDataCollection(string config, Dictionary<string, string> labels, ILogging logger)
		{
			string dctype = config.ToLowerInvariant();
			switch (dctype)
			{
				case "prometheus":
				{
					IDataCollection dc = new DataCollectionPrometheus(labels, logger); 
					Constants.Initialize(dc);
					return dc;
				}
				case "fake":
				{
					IDataCollection dc = new DataCollectionFake(labels, logger); 
					Constants.Initialize(dc);
					return dc;
				}
			}
			throw new Exception($"Invalid config: {dctype}  Expected: prometheus");
		}

		static public async Task<IAuthentication> CreateAuthentication(string config, ILogging logger)
		{
            // Must be: always or openid,openidurl
			string[] parts = config.Split(',');
			string authType  = parts[0].ToLowerInvariant();
			string openIdUrl = parts.Length>1 ? parts[1] : string.Empty;

			switch (authType)
			{
				case "always":
					return new AuthenticationAlways(logger);
				case "openid":
				{
					OAuth2Helper helper = new OAuth2Helper(logger);
					Dictionary<string, RSA>? publicKeys = await helper.GetPublicKeys(openIdUrl).ConfigureAwait(false);
					if (publicKeys!=null)
						return new AuthenticationJWT(publicKeys, logger);
					throw new Exception($"No public keys for openId endpoint {openIdUrl}");
				}
			}
			throw new Exception($"Invalid authentication type: {authType}");
		}

		static public GitManager CreateGitManager(string repositoryPath, string gitConfig, ILogging logger)
		{
			// Parse git config string: "remote_url,username,password,branch"
			string remoteUrl = string.Empty;
			string username = string.Empty;
			string password = string.Empty;
			string branch = "main";

			if (!string.IsNullOrWhiteSpace(gitConfig))
			{
				string[] parts = gitConfig.Split(',');
				if (parts.Length >= 1) remoteUrl = parts[0].Trim();
				if (parts.Length >= 2) username = parts[1].Trim();
				if (parts.Length >= 3) password = parts[2].Trim();
				if (parts.Length >= 4 && !string.IsNullOrWhiteSpace(parts[3])) branch = parts[3].Trim();
			}

			return new GitManager(repositoryPath, logger, remoteUrl, username, password, branch);
		}

		static public ILogging CreateLogger(string prefix, string config)
		{
			// Where [0=Errors, 1=Warnings, 2=Info, 3=Debug, 4=Extreme]
			string[] parts = config.Split(',');
			string ltype = parts[0].ToLowerInvariant();
			int verbosity = int.Parse(parts[1], System.Globalization.NumberStyles.Integer, CultureInfo.InvariantCulture);
			string filePath = parts.Length>2 ? parts[2] : string.Empty;

			switch (ltype)
			{
				case "file": 
					return new LoggingFile(prefix, (EVerbosity)verbosity, filePath);  // file,#,/folder/path/ which turns into /folder/path/prefix.log
				case "console": 
					return new LoggingConsole(prefix, (EVerbosity)verbosity);  // console,#
			}
			throw new Exception($"Invalid config: {ltype}  Expected: file,console");
		}
	}
}
