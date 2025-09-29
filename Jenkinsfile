pipeline {
    agent any
    environment {
        IMAGE_NAME            = "astrobot"
        TAG                   = "latest"
        REGISTRY              = "10.243.4.236:5000"
        DEPLOYMENT_NAME       = "astrobot"
        PRIMARY_DOCKER_HOST   = "tcp://10.243.250.132:2375"
        SECONDARY_DOCKER_HOST = "tcp://10.243.4.236:2375"
        APP_NETWORK           = "app"
    }
    stages {
        stage('Check Docker Host Availability') {
            steps {
                script {
                    echo 'Checking Docker host availability...'
                    
                    // Try primary host first (with 3 second timeout)
                    def primaryAvailable = sh(
                        script: "timeout 3 docker -H ${PRIMARY_DOCKER_HOST} info >/dev/null 2>&1",
                        returnStatus: true
                    ) == 0
                    
                    if (primaryAvailable) {
                        env.DOCKER_HOST = env.PRIMARY_DOCKER_HOST
                        echo "✓ Primary Docker host is available: ${PRIMARY_DOCKER_HOST}"
                    } else {
                        echo "✗ Primary Docker host is DOWN: ${PRIMARY_DOCKER_HOST}"
                        echo "Attempting to use secondary Docker host..."
                        
                        // Try secondary host (with 3 second timeout)
                        def secondaryAvailable = sh(
                            script: "timeout 3 docker -H ${SECONDARY_DOCKER_HOST} info >/dev/null 2>&1",
                            returnStatus: true
                        ) == 0
                        
                        if (secondaryAvailable) {
                            env.DOCKER_HOST = env.SECONDARY_DOCKER_HOST
                            echo "✓ Secondary Docker host is available: ${SECONDARY_DOCKER_HOST}"
                        } else {
                            error "✗ Both Docker hosts are unavailable. Cannot proceed with deployment."
                        }
                    }
                    
                    echo "Using Docker host: ${env.DOCKER_HOST}"
                }
            }
        }
        
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
                    sh "docker push ${REGISTRY}/${IMAGE_NAME}:${TAG}"
                }
            }
        }
        
        stage('Deploy to Remote Docker') {
            steps {
                script {
                    echo "Deploying ${DEPLOYMENT_NAME} on ${env.DOCKER_HOST}..."
                    
                    // Create app network if not exists
                    sh """
                        docker -H ${env.DOCKER_HOST} network inspect ${APP_NETWORK} >/dev/null 2>&1 || \
                        docker -H ${env.DOCKER_HOST} network create ${APP_NETWORK}
                    """
                    
                    // Stop and remove old container if running
                    sh """
                        docker -H ${env.DOCKER_HOST} ps -q --filter name=${DEPLOYMENT_NAME} | grep -q . && \
                        docker -H ${env.DOCKER_HOST} stop ${DEPLOYMENT_NAME} || true
                    """
                    sh """
                        docker -H ${env.DOCKER_HOST} ps -aq --filter name=${DEPLOYMENT_NAME} | grep -q . && \
                        docker -H ${env.DOCKER_HOST} rm ${DEPLOYMENT_NAME} || true
                    """
                    
                    // Run new container
                    sh """
                        docker -H ${env.DOCKER_HOST} run -d --name ${DEPLOYMENT_NAME} \\
                        --network ${APP_NETWORK} \\
                        ${REGISTRY}/${IMAGE_NAME}:${TAG}
                    """
                    
                    echo "✓ Deployment successful on ${env.DOCKER_HOST}"
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
    
    post {
        success {
            echo "Pipeline completed successfully using: ${env.DOCKER_HOST}"
        }
        failure {
            echo "Pipeline failed. Last attempted Docker host: ${env.DOCKER_HOST}"
        }
    }
}
