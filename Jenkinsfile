pipeline {
    agent any

    environment {
        IMAGE_NAME      = "astrobot"
        TAG             = "latest"
        REGISTRY        = "docker.kahitoz.com"
        DEPLOYMENT_NAME = "astrobot"
        DOCKER_HOST     = "tcp://10.243.52.185:2375"
        APP_NETWORK     = "app"
    }

    stages {
        stage('Build Docker Image') {
            steps {
                script {
                    echo 'Building Docker Image...'
                    sh "docker build -t ${IMAGE_NAME}:${TAG} ."
                }
            }
        }

        stage('Tag Image for Registry') {
            steps {
                script {
                    echo 'Tagging image for remote registry...'
                    sh "docker tag ${IMAGE_NAME}:${TAG} ${REGISTRY}/${IMAGE_NAME}:${TAG}"
                }
            }
        }

        stage('Push Image to Registry') {
            steps {
                script {
                    echo 'Pushing Docker Image to Registry...'
                    sh "docker push http://10.243.4.236:5000/${IMAGE_NAME}:${TAG}"
                }
            }
        }

        stage('Deploy to Remote Docker') {
            steps {
                script {
                    echo "Deploying ${DEPLOYMENT_NAME} on remote Docker host..."

                    // Create app network if not exists
                    sh """
                        docker -H ${DOCKER_HOST} network inspect ${APP_NETWORK} >/dev/null 2>&1 || \
                        docker -H ${DOCKER_HOST} network create ${APP_NETWORK}
                    """

                    // Stop and remove old container if running
                    sh """
                        docker -H ${DOCKER_HOST} ps -q --filter name=${DEPLOYMENT_NAME} | grep -q . && \
                        docker -H ${DOCKER_HOST} stop ${DEPLOYMENT_NAME} || true
                    """
                    sh """
                        docker -H ${DOCKER_HOST} ps -aq --filter name=${DEPLOYMENT_NAME} | grep -q . && \
                        docker -H ${DOCKER_HOST} rm ${DEPLOYMENT_NAME} || true
                    """

                    // Run new container
                    sh """
                        docker -H ${DOCKER_HOST} run -d --name ${DEPLOYMENT_NAME} \\
                        --network ${APP_NETWORK} \\
                        ${REGISTRY}/${IMAGE_NAME}:${TAG}
                    """
                }
            }
        }

        stage('Cleanup Local') {
            steps {
                script {
                    echo 'Cleaning up unused local Docker resources...'
                    sh "docker image prune -f"
                    sh "docker container prune -f"
                }
            }
        }
    }
}