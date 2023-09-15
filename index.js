function getInfo() {
  const http = require('http');
  const { exec } = require('child_process');
  const config = require('./config.json');

  const server = http.createServer(async (request, response) => {
    const parts = request.url.split('/');
    if (parts[1] !== 'check') return response.end('Cannot get ' + request.url);

    const username = parts[2].split('?')[0];
    if (!username) return response.end('Param username pending');

    let connectionLimit, connectionCount, expirationDate, expirationDays;

    const getConnectionCount = new Promise((resolve) => {
      exec('ss -tuln | grep -c ' + username, (error, stdout) => {
        if (error) connectionCount = 0;
        if (stdout) connectionCount = parseInt(stdout.trim());
        resolve(connectionCount);
      });
    });

    const getLimit = new Promise((resolve) => {
      exec('cat /root/usuarios.db | cut -d\' \' -f2', (error, stdout) => {
        if (error) connectionLimit = 0;
        if (stdout) connectionLimit = parseInt(stdout.trim());
        resolve(connectionLimit);
      });
    });

    const getExpirationDate = new Promise((resolve) => {
      exec('chage -l ' + username + ' | grep -i co | awk -F: \'{print $2}\'', (error, stdout) => {
        if (error) expirationDate = '00/00/0000';
        if (stdout) expirationDate = stdout.trim();
        const matches = expirationDate.match(/(\d{2}\/\d{2}\/\d{4})/);
        const expiration = matches ? matches[1] : null;
        resolve(expiration || '00/00/0000');
      });
    });

    const getDaysToExpiration = new Promise((resolve) => {
      exec('chage -l ' + username + ' | grep -i co | awk -F: \'{print $2}\'', (error, stdout) => {
        if (error) expirationDays = 0;
        if (stdout) expirationDays = 0;
        const matches = stdout.match(/-e (\d+)/);
        const days = matches ? parseInt(matches[1]) : null;
        resolve(days || 0);
      });
    });

    connectionLimit = await getLimit;
    connectionCount = await getConnectionCount;
    expirationDate = await getExpirationDate;
    expirationDays = await getDaysToExpiration;

    response.end(
      JSON.stringify({
        username,
        limit_connections: connectionLimit,
        count_connections: connectionCount,
        expiration_date: expirationDate,
        expiration_days: expirationDays,
      })
    );
  });

  try {
    server.listen(config.listen_port);
  } catch (error) {
    console.log('Error: ' + config.listen_port + ' ' + error);
  }
}