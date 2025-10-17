pipeline {
    agent any

    parameters {
        choice(
            name: 'DEPLOY_TARGET',
            choices: ['both', 'kahitoz', 'naman'],
            description: 'Select where to deploy the container'
        )
    }

    environment {
        IMAGE_NAME = 'halfskirmish-astrobot'
        IMAGE_TAG = 'latest'
        BUILD_REGISTRY = 'registrypush.kahitoz.com:5000'
        DEPLOY_REGISTRY = 'registry.kahitoz.com'

        KAHITOZ_DOCKER_HOST = 'tcp://kahitozrunner:2375'
        NAMAN_DOCKER_HOST = 'tcp://naman:2375'

        CONTAINER_NAME = 'halfskirmish-astrobot'
        NETWORK_NAME = 'app'
    }

    stages {

        stage('Build Docker Image') {
            steps {
                script {
                    echo "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
                    
                    // Load environment variables from Jenkins credentials
                    withCredentials([
                        string(credentialsId: 'NEXT_PUBLIC_API_URL', variable: 'NEXT_PUBLIC_API_URL'),
                        string(credentialsId: 'NEXT_PUBLIC_ADMIN', variable: 'NEXT_PUBLIC_ADMIN'),
                        string(credentialsId: 'NEXT_PUBLIC_API_USERNAME', variable: 'NEXT_PUBLIC_API_USERNAME'),
                        string(credentialsId: 'NEXT_PUBLIC_API_PASSWORD', variable: 'NEXT_PUBLIC_API_PASSWORD')
                    ]) {
                        // Debug: Print the values (mask sensitive ones)
                        echo "API URL: ${NEXT_PUBLIC_API_URL}"
                        echo "Admin: ${NEXT_PUBLIC_ADMIN}"
                        echo "Username configured: ${NEXT_PUBLIC_API_USERNAME ? 'Yes' : 'No'}"
                        
                        sh """
                            docker build \
                                --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
                                --build-arg NEXT_PUBLIC_ADMIN="${NEXT_PUBLIC_ADMIN}" \
                                --build-arg NEXT_PUBLIC_API_USERNAME="${NEXT_PUBLIC_API_USERNAME}" \
                                --build-arg NEXT_PUBLIC_API_PASSWORD="${NEXT_PUBLIC_API_PASSWORD}" \
                                -t ${BUILD_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} .
                        """
                    }
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                script {
                    echo "Logging into Docker registries and pushing images..."
                    withCredentials([usernamePassword(credentialsId: 'docker_creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh """
                            # Login to both registries
                            echo "\$DOCKER_PASS" | docker login ${BUILD_REGISTRY} -u "\$DOCKER_USER" --password-stdin
                            echo "\$DOCKER_PASS" | docker login ${DEPLOY_REGISTRY} -u "\$DOCKER_USER" --password-stdin
                            
                            # Push to build registry
                            docker push ${BUILD_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                            
                            # Re-tag and push to deploy registry
                            docker tag ${BUILD_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} ${DEPLOY_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                            docker push ${DEPLOY_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                            
                            # Logout from registries
                            docker logout ${BUILD_REGISTRY} || true
                            docker logout ${DEPLOY_REGISTRY} || true
                        """
                    }
                }
            }
        }

        stage('Deploy to Docker Hosts') {
            parallel {

                stage('Deploy to Kahitoz') {
                    when {
                        anyOf {
                            expression { params.DEPLOY_TARGET == 'both' }
                            expression { params.DEPLOY_TARGET == 'kahitoz' }
                        }
                    }
                    steps {
                        script {
                            echo "Deploying to Kahitoz Docker host..."
                            withCredentials([usernamePassword(credentialsId: 'docker_creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                                sh '''
                                    echo "$DOCKER_PASS" | DOCKER_HOST=''' + KAHITOZ_DOCKER_HOST + ''' docker login ''' + DEPLOY_REGISTRY + ''' -u "$DOCKER_USER" --password-stdin
                                    DOCKER_HOST=''' + KAHITOZ_DOCKER_HOST + ''' docker stop ''' + CONTAINER_NAME + ''' || true
                                    DOCKER_HOST=''' + KAHITOZ_DOCKER_HOST + ''' docker rm ''' + CONTAINER_NAME + ''' || true
                                    DOCKER_HOST=''' + KAHITOZ_DOCKER_HOST + ''' docker pull ''' + DEPLOY_REGISTRY + '''/''' + IMAGE_NAME + ''':''' + IMAGE_TAG + '''
                                    DOCKER_HOST=''' + KAHITOZ_DOCKER_HOST + ''' docker run -d \
                                        --name ''' + CONTAINER_NAME + ''' \
                                        --network ''' + NETWORK_NAME + ''' \
                                        --restart always \
                                        ''' + DEPLOY_REGISTRY + '''/''' + IMAGE_NAME + ''':''' + IMAGE_TAG + '''
                                    DOCKER_HOST=''' + KAHITOZ_DOCKER_HOST + ''' docker logout ''' + DEPLOY_REGISTRY + ''' || true
                                '''
                            }
                        }
                    }
                }

                stage('Deploy to Naman') {
                    when {
                        anyOf {
                            expression { params.DEPLOY_TARGET == 'both' }
                            expression { params.DEPLOY_TARGET == 'naman' }
                        }
                    }
                    steps {
                        script {
                            echo "Deploying to Naman Docker host..."
                            withCredentials([usernamePassword(credentialsId: 'docker_creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                                sh '''
                                    echo "$DOCKER_PASS" | DOCKER_HOST=''' + NAMAN_DOCKER_HOST + ''' docker login ''' + DEPLOY_REGISTRY + ''' -u "$DOCKER_USER" --password-stdin
                                    DOCKER_HOST=''' + NAMAN_DOCKER_HOST + ''' docker stop ''' + CONTAINER_NAME + ''' || true
                                    DOCKER_HOST=''' + NAMAN_DOCKER_HOST + ''' docker rm ''' + CONTAINER_NAME + ''' || true
                                    DOCKER_HOST=''' + NAMAN_DOCKER_HOST + ''' docker pull ''' + DEPLOY_REGISTRY + '''/''' + IMAGE_NAME + ''':''' + IMAGE_TAG + '''
                                    DOCKER_HOST=''' + NAMAN_DOCKER_HOST + ''' docker run -d \
                                        --name ''' + CONTAINER_NAME + ''' \
                                        --network ''' + NETWORK_NAME + ''' \
                                        --restart always \
                                        -p 3000:3000 \
                                        ''' + DEPLOY_REGISTRY + '''/''' + IMAGE_NAME + ''':''' + IMAGE_TAG + '''
                                    DOCKER_HOST=''' + NAMAN_DOCKER_HOST + ''' docker logout ''' + DEPLOY_REGISTRY + ''' || true
                                '''
                            }
                        }
                    }
                }
            }
        }
    }

    post {
        cleanup {
            script {
                echo "Cleaning up local Docker images..."
                sh """
                    docker rmi ${BUILD_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} || true
                    docker rmi ${DEPLOY_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} || true
                    docker system prune -f || true
                """
            }
        }
    }
}