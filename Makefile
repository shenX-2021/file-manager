default: help

# make release [tag=a.b.c]
docker-release:
	# 发布docker
	./build/docker-release.sh $(tag)


help:
	@printf "   make \033[1m命令使用说明\033[0m\n"
	@printf "   \033[35mmake docker-release [tag=a.b.c]		\033[0m\t\033[0m\t\033[0m\t\033[0m\t- docker环境构建发布\n"
	@printf "   \033[35mmake help					\033[0m\t\033[0m\t\033[0m\t\033[0m\t- 使用帮助\n"
