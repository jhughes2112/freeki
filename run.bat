start http://localhost:7777

docker run -it --rm  --name freeki -p 7777:7777 ^
  -v %cd%/data:/data -w /data ^
  dev.reachablegames.com/freeki:latest --storage_config file,/data