import Hero from '../components/home/Hero'
import BloodTypes from '../components/home/BloodTypes'
import HowItWorks from '../components/home/HowItWorks'
import Features from '../components/home/Features'
import Impact from '../components/home/Impact'
import Roles from '../components/home/Roles'
import CtaBanner from '../components/home/CtaBanner'
import Footer from '../components/home/Footer'

export default function Home() {
  return (
    <div className="home">
      <Hero />
      <BloodTypes />
      <HowItWorks />
      <Features />
      <Impact />
      <Roles />
      <CtaBanner />
      <Footer />
    </div>
  )
}
