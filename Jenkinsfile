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
                    sh """
                        docker build -t ${BUILD_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} .
                    """
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                script {
                    echo "Logging into Docker registries..."
                    withCredentials([usernamePassword(credentialsId: 'docker_creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh '''
                            echo "$DOCKER_PASS" | docker login ''' + BUILD_REGISTRY + ''' -u "$DOCKER_USER" --password-stdin
                            echo "$DOCKER_PASS" | docker login ''' + DEPLOY_REGISTRY + ''' -u "$DOCKER_USER" --password-stdin
                        '''
                    }

                    echo "Pushing image to ${BUILD_REGISTRY}..."
                    sh """
                        docker push ${BUILD_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                    """

                    echo "Re-tagging and pushing to ${DEPLOY_REGISTRY}..."
                    sh """
                        docker tag ${BUILD_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} ${DEPLOY_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                        docker push ${DEPLOY_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                    """

                    echo "Logout from registries"
                    sh """
                        docker logout ${BUILD_REGISTRY} || true
                        docker logout ${DEPLOY_REGISTRY} || true
                    """
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


