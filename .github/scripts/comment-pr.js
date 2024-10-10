const { Octokit } = require("@octokit/rest");
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const path = require('path');

async function generateChart() {
  const width = 800; // Width of the chart
  const height = 600; // Height of the chart
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

  const configuration = {
    type: 'bar',
    data: {
      labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
      datasets: [{
        label: 'My First dataset',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1,
        data: [65, 59, 80, 81, 56, 55, 40],
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };

  return chartJSNodeCanvas.renderToBuffer(configuration);
}

async function run() {
  try {
    console.log("Iniciando el script...");

    const token = process.env.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: `token ${token}` });

    const { GITHUB_REPOSITORY, GITHUB_EVENT_PATH } = process.env;
    const [owner, repo] = GITHUB_REPOSITORY.split('/');
    const event = require(GITHUB_EVENT_PATH);

    const prNumber = event.pull_request.number;
    const prDescription = event.pull_request.body;

    console.log(`Número del PR: ${prNumber}`);
    console.log(`Descripción del PR: ${prDescription}`);

    // Generar el gráfico
    const imageBuffer = await generateChart();
    const imagePath = path.join(__dirname, 'chart.png');
    fs.writeFileSync(imagePath, imageBuffer);
    console.log('Gráfico generado y guardado en chart.png');

    // Subir el archivo al repositorio usando la API de GitHub
    const content = fs.readFileSync(imagePath, { encoding: 'base64' });
    const imageUploadPath = `charts/chart-${Date.now()}.png`;

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: imageUploadPath,
      message: `Add chart generated for PR #${prNumber}`,
      content,
      committer: {
        name: 'GitHub Action',
        email: 'action@github.com'
      },
      author: {
        name: 'GitHub Action',
        email: 'action@github.com'
      }
    });

    const imageUrl = `https://github.com/${owner}/${repo}/blob/main/${imageUploadPath}?raw=true`;

    const commentBody = `
      **Descripción del PR:**
      ${prDescription}

      ![Generated Chart](${imageUrl})
    `;

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: commentBody
    });

    console.log("Comentario con gráfico agregado exitosamente al PR.");
  } catch (error) {
    console.error("Error al ejecutar el script:", error);
  }
}

run();