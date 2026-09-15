// components/CricketMatches.jsx
import React from 'react';
import CricketTournament from './CricketTournament';

const CricketMatches = () => {
  const tournaments = [
    {
      id: 'india-trophy-u23-women',
      name: 'India. Trophy U23. Women',
      countryCode: 'IN',
      flag: '🇮🇳',
      totalMarkets: 5,
      matches: [
        {
          id: 'baroda-uttarakhand',
          team1: {
            name: 'Baroda (Women)',
            logo: 'https://v3.traincdn.com/resized/size16/sfiles/logo_teams/62cc74d111c2c5bbb271b49afe19bf69.webp',
            abbreviation: 'BAR'
          },
          team2: {
            name: 'Uttarakhand (Women)',
            logo: 'https://v3.traincdn.com/resized/size16/sfiles/logo_teams/2b5daf31939baf3573d7f32267f0beff.webp',
            abbreviation: 'UTT'
          },
          scores: {
            team1: '105/6',
            team2: '48/1 (7.0)',
            inning: 'second'
          },
          marketGroups: [
            { type: '1X2', values: ['-', '-', '-'] },
            { type: 'Total', values: ['-', '-', '-'] },
            { type: 'IT1', values: ['-', '-', '-'] }
          ],
          additionalMarkets: 2,
          hasLiveStream: false
        },
        {
          id: 'chhattisgarh-madhya-pradesh',
          team1: {
            name: 'Chhattisgarh (Women)',
            logo: 'https://v3.traincdn.com/resized/size16/sfiles/logo_teams/a16c430f4147a636f180637078eae9bd.webp',
            abbreviation: 'CHH'
          },
          team2: {
            name: 'Madhya Pradesh (Women)',
            logo: 'https://v3.traincdn.com/resized/size16/sfiles/logo_teams/403c2bf37e35fd79573ef307be68e54c.webp',
            abbreviation: 'MP'
          },
          scores: {
            team1: '88/6',
            team2: '19/4 (5.4)',
            inning: 'second'
          },
          marketGroups: [
            { type: '1X2', values: ['1.752', '25', '2.04'] },
            { type: 'Total', values: ['-', '-', '-'] },
            { type: 'IT1', values: ['-', '-', '-'] }
          ],
          additionalMarkets: 9,
          hasLiveStream: false
        }
      ]
    },
    {
      id: 'pakistan-quaid-e-azam-trophy',
      name: 'Pakistan. Quaid e-Azam Trophy',
      countryCode: 'PK',
      flag: '🇵🇰',
      totalMarkets: 5,
      matches: [
        {
          id: 'karachi-sialkot',
          team1: {
            name: 'Karachi Region Blues',
            logo: 'https://v3.traincdn.com/resized/size16/sfiles/logo_teams/c29d9e778736524be7dbcd520877e801.webp',
            abbreviation: 'KRB'
          },
          team2: {
            name: 'Sialkot Region',
            logo: 'https://v3.traincdn.com/resized/size16/sfiles/logo_teams/8e3c869dde8bbf7c6019776263982559.webp',
            abbreviation: 'SIA'
          },
          scores: {
            team1: '12/0 (5.0)',
            team2: '0/0',
            inning: 'first'
          },
          marketGroups: [
            { type: '1X2', values: ['-', '-', '-'] },
            { type: 'Total', values: ['-', '-', '-'] },
            { type: 'IT1', values: ['-', '-', '-'] }
          ],
          additionalMarkets: 2,
          hasLiveStream: false,
          hasStats: true,
          hasOddsChart: true,
          hasDraw: true
        }
      ]
    }
  ];

  return (
    <>
      {tournaments.map((tournament) => (
        <CricketTournament key={tournament.id} tournament={tournament} />
      ))}
    </>
  );
};

export default CricketMatches;