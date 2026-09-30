import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Code2, Rocket, Activity, RefreshCw, ArrowRight, Network, BrainCircuit, TerminalSquare, Eye, Target, Share2, ServerCrash, Archive, Cloud, Zap, ShieldCheck, Check, Cpu, Radio, Database, LayoutDashboard } from 'lucide-react'
import { AppBar } from '../organisms/AppBar'
import { ScrollReveal } from '../atoms/ScrollReveal'
import { useLanguage } from '../../contexts/LanguageContext'

export default function LandingPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [signupEmail, setSignupEmail] = useState('')

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (signupEmail) {
      navigate(`/signup?email=${encodeURIComponent(signupEmail)}`)
    } else {
      navigate('/signup')
    }
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-base selection:bg-primary/30">
      <AppBar />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-4 flex flex-col items-center text-center">
        <ScrollReveal>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            {t('landingHeroTitle1')} <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              {t('landingHeroTitle2')}
            </span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={150}>
          <p className="text-lg md:text-xl text-text-muted max-w-3xl mb-10 leading-relaxed mx-auto">
            {t('landingHeroSubtitle')}
          </p>
        </ScrollReveal>
        <ScrollReveal delay={300}>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/signup"
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl text-lg font-medium transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95 flex items-center justify-center gap-2"
            >
              {t('landingGetDemo')}
            </Link>
            <a
              href="#features"
              className="bg-bg-surface hover:bg-bg-modifier-hover text-text-base border border-border-base px-8 py-3 rounded-xl text-lg font-medium transition-colors flex items-center justify-center"
            >
              {t('landingLearnMore')}
            </a>
          </div>
        </ScrollReveal>
      </main>

      {/* About & Objective Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24">
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* What is Orchestrack */}
          <ScrollReveal>
            <div className="bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl p-8 md:p-12 flex flex-col justify-center h-full">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-text-base">
                {t('landingAboutTitle')}
              </h2>
              <p className="text-lg text-text-muted leading-relaxed">
                {t('landingAboutDescription')}
              </p>
            </div>
          </ScrollReveal>
          
          {/* Our Objective */}
          <ScrollReveal delay={200}>
            <div className="bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl p-8 md:p-12 relative overflow-hidden flex flex-col justify-center h-full">
              {/* Subtle glow effect for premium feel */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-text-base relative z-10">
                {t('landingObjectiveTitle')}
              </h2>
              <p className="text-lg text-text-muted leading-relaxed relative z-10">
                {t('landingObjectiveDescription')}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Differentiators & Pillars Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <ScrollReveal>
          <div className="text-center mb-16 max-w-4xl mx-auto">
            <p className="text-xl md:text-2xl text-text-muted leading-relaxed">
              {t('landingDiffHook')}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Pillar 1 */}
          <ScrollReveal delay={100}>
            <div className="bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl p-8 flex flex-col items-center text-center hover:shadow-primary/20 hover:shadow-[0_0_35px_var(--tw-shadow-color)] hover:-translate-y-1 transition-all h-full">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                <Network className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-4 text-text-base">{t('landingPillar1Title')}</h3>
              <p className="text-text-muted leading-relaxed">{t('landingPillar1Desc')}</p>
            </div>
          </ScrollReveal>

          {/* Pillar 2 */}
          <ScrollReveal delay={200}>
            <div className="bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl p-8 flex flex-col items-center text-center hover:shadow-purple-500/20 hover:shadow-[0_0_35px_var(--tw-shadow-color)] hover:-translate-y-1 transition-all h-full">
              <div className="w-16 h-16 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center mb-6">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-4 text-text-base">{t('landingPillar2Title')}</h3>
              <p className="text-text-muted leading-relaxed">{t('landingPillar2Desc')}</p>
            </div>
          </ScrollReveal>

          {/* Pillar 3 */}
          <ScrollReveal delay={300}>
            <div className="bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl p-8 flex flex-col items-center text-center hover:shadow-green-500/20 hover:shadow-[0_0_35px_var(--tw-shadow-color)] hover:-translate-y-1 transition-all h-full">
              <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mb-6">
                <TerminalSquare className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-4 text-text-base">{t('landingPillar3Title')}</h3>
              <p className="text-text-muted leading-relaxed">{t('landingPillar3Desc')}</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* SDLC Animated Section */}
      <section id="sdlc" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text-base">
              {t('landingSdlcTitle')}
            </h2>
          </div>
        </ScrollReveal>

        <div className="relative">
          {/* Connecting animated line background (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 bg-border-base -translate-y-1/2 rounded-full overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-primary via-purple-500 to-primary animate-[pulse_3s_ease-in-out_infinite] opacity-50"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {/* Step 1 */}
            <ScrollReveal delay={100} className="relative group h-[340px] [perspective:1000px]">
              <div className="relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                {/* Front */}
                <div className="absolute inset-0 bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-2xl p-6 flex flex-col justify-start pt-10 [backface-visibility:hidden]">
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 mx-auto lg:mx-0">
                    <Code2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-text-base text-center lg:text-left">{t('landingSdlcStep1Title')}</h3>
                  <p className="text-text-muted text-center lg:text-left">{t('landingSdlcStep1Desc')}</p>
                </div>
                {/* Back */}
                <div className="absolute inset-0 bg-bg-base rounded-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="absolute inset-0 bg-primary/5 border border-primary/30 rounded-2xl p-6 shadow-xl flex items-center justify-center text-center">
                    <p className="text-[15px] text-text-base leading-relaxed font-medium">
                      {t('landingSdlcStep1Back')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 text-border-base z-20">
                <ArrowRight className="w-6 h-6" />
              </div>
            </ScrollReveal>

            {/* Step 2 */}
            <ScrollReveal delay={200} className="relative group h-[340px] [perspective:1000px]">
              <div className="relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                {/* Front */}
                <div className="absolute inset-0 bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-2xl p-6 flex flex-col justify-start pt-10 [backface-visibility:hidden]">
                  <div className="w-14 h-14 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center mb-6 mx-auto lg:mx-0">
                    <Rocket className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-text-base text-center lg:text-left">{t('landingSdlcStep2Title')}</h3>
                  <p className="text-text-muted text-center lg:text-left">{t('landingSdlcStep2Desc')}</p>
                </div>
                {/* Back */}
                <div className="absolute inset-0 bg-bg-base rounded-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="absolute inset-0 bg-purple-500/5 border border-purple-500/30 rounded-2xl p-6 shadow-xl flex items-center justify-center text-center">
                    <p className="text-[15px] text-text-base leading-relaxed font-medium">
                      {t('landingSdlcStep2Back')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 text-border-base z-20">
                <ArrowRight className="w-6 h-6" />
              </div>
            </ScrollReveal>

            {/* Step 3 */}
            <ScrollReveal delay={300} className="relative group h-[340px] [perspective:1000px]">
              <div className="relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                {/* Front */}
                <div className="absolute inset-0 bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-2xl p-6 flex flex-col justify-start pt-10 [backface-visibility:hidden]">
                  <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mb-6 mx-auto lg:mx-0">
                    <Activity className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-text-base text-center lg:text-left">{t('landingSdlcStep3Title')}</h3>
                  <p className="text-text-muted text-center lg:text-left">{t('landingSdlcStep3Desc')}</p>
                </div>
                {/* Back */}
                <div className="absolute inset-0 bg-bg-base rounded-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="absolute inset-0 bg-blue-500/5 border border-blue-500/30 rounded-2xl p-6 shadow-xl flex items-center justify-center text-center">
                    <p className="text-[15px] text-text-base leading-relaxed font-medium">
                      {t('landingSdlcStep3Back')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 text-border-base z-20">
                <ArrowRight className="w-6 h-6" />
              </div>
            </ScrollReveal>

            {/* Step 4 */}
            <ScrollReveal delay={400} className="relative group h-[340px] [perspective:1000px]">
              <div className="relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                {/* Front */}
                <div className="absolute inset-0 bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-2xl p-6 flex flex-col justify-start pt-10 [backface-visibility:hidden]">
                  <div className="w-14 h-14 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center mb-6 mx-auto lg:mx-0">
                    <RefreshCw className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-text-base text-center lg:text-left">{t('landingSdlcStep4Title')}</h3>
                  <p className="text-text-muted text-center lg:text-left">{t('landingSdlcStep4Desc')}</p>
                </div>
                {/* Back */}
                <div className="absolute inset-0 bg-bg-base rounded-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="absolute inset-0 bg-green-500/5 border border-green-500/30 rounded-2xl p-6 shadow-xl flex items-center justify-center text-center">
                    <p className="text-[15px] text-text-base leading-relaxed font-medium">
                      {t('landingSdlcStep4Back')}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative overflow-hidden">
        {/* Background Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-primary tracking-widest uppercase mb-3">
              {t('landingSolutionSectionSubtitle')}
            </h2>
            <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight text-text-base">
              {t('landingSolutionSectionTitle')}
            </h3>
          </div>
        </ScrollReveal>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Solution 1 */}
          <ScrollReveal delay={100}>
            <div className="group relative bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl p-8 hover:shadow-blue-500/20 hover:shadow-[0_0_35px_var(--tw-shadow-color)] hover:-translate-y-2 transition-all z-10 overflow-hidden h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
              <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Cloud className="w-7 h-7" />
              </div>
              <h4 className="text-2xl font-bold tracking-tight mb-4 text-text-base">{t('landingSolution1Title')}</h4>
              <p className="text-text-muted leading-relaxed">
                {t('landingSolution1Desc')}
              </p>
            </div>
          </ScrollReveal>

          {/* Solution 2 */}
          <ScrollReveal delay={200}>
            <div className="group relative bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl p-8 hover:shadow-yellow-500/20 hover:shadow-[0_0_35px_var(--tw-shadow-color)] hover:-translate-y-6 transition-all z-10 overflow-hidden lg:-translate-y-4 h-full">
              <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
              <div className="w-14 h-14 bg-yellow-500/10 text-yellow-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7" />
              </div>
              <h4 className="text-2xl font-bold tracking-tight mb-4 text-text-base">{t('landingSolution2Title')}</h4>
              <p className="text-text-muted leading-relaxed">
                {t('landingSolution2Desc')}
              </p>
            </div>
          </ScrollReveal>

          {/* Solution 3 */}
          <ScrollReveal delay={300}>
            <div className="group relative bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl p-8 hover:shadow-emerald-500/20 hover:shadow-[0_0_35px_var(--tw-shadow-color)] hover:-translate-y-2 transition-all z-10 overflow-hidden h-full">
              <div className="absolute inset-0 bg-gradient-to-bl from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h4 className="text-2xl font-bold tracking-tight mb-4 text-text-base">{t('landingSolution3Title')}</h4>
              <p className="text-text-muted leading-relaxed">
                {t('landingSolution3Desc')}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Core Features Depth Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="space-y-32">
          
          {/* Feature 1 */}
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-center gap-12 group">
              <div className="flex-1 space-y-6">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                  <Eye className="w-8 h-8" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-text-base">{t('landingFeature1Title')}</h3>
                <p className="text-lg text-text-muted leading-relaxed">
                  {t('landingFeature1Desc')}
                </p>
              </div>
              <div className="flex-1 w-full">
                 <div className="w-full aspect-[4/3] md:aspect-video bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl overflow-hidden relative flex items-center justify-center group-hover:shadow-blue-500/20 transition-all">
                   <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                   <Eye className="w-32 h-32 text-blue-500/20 group-hover:text-blue-500/40 group-hover:scale-110 transition-all duration-700" />
                 </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 2 */}
          <ScrollReveal>
            <div className="flex flex-col md:flex-row-reverse items-center gap-12 group">
              <div className="flex-1 space-y-6">
                <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-text-base">{t('landingFeature2Title')}</h3>
                <p className="text-lg text-text-muted leading-relaxed">
                  {t('landingFeature2Desc')}
                </p>
              </div>
              <div className="flex-1 w-full">
                 <div className="w-full aspect-[4/3] md:aspect-video bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl overflow-hidden relative flex items-center justify-center group-hover:shadow-rose-500/20 transition-all">
                   <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 to-transparent"></div>
                   <Target className="w-32 h-32 text-rose-500/20 group-hover:text-rose-500/40 group-hover:scale-110 transition-all duration-700" />
                 </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 3 */}
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-center gap-12 group">
              <div className="flex-1 space-y-6">
                <div className="w-16 h-16 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center">
                  <Share2 className="w-8 h-8" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-text-base">{t('landingFeature3Title')}</h3>
                <p className="text-lg text-text-muted leading-relaxed">
                  {t('landingFeature3Desc')}
                </p>
              </div>
              <div className="flex-1 w-full">
                 <div className="w-full aspect-[4/3] md:aspect-video bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl overflow-hidden relative flex items-center justify-center group-hover:shadow-purple-500/20 transition-all">
                   <div className="absolute inset-0 bg-gradient-to-bl from-purple-500/5 to-transparent"></div>
                   <Share2 className="w-32 h-32 text-purple-500/20 group-hover:text-purple-500/40 group-hover:scale-110 transition-all duration-700" />
                 </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 4 */}
          <ScrollReveal>
            <div className="flex flex-col md:flex-row-reverse items-center gap-12 group">
              <div className="flex-1 space-y-6">
                <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center">
                  <ServerCrash className="w-8 h-8" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-text-base">{t('landingFeature4Title')}</h3>
                <p className="text-lg text-text-muted leading-relaxed">
                  {t('landingFeature4Desc')}
                </p>
              </div>
              <div className="flex-1 w-full">
                 <div className="w-full aspect-[4/3] md:aspect-video bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl overflow-hidden relative flex items-center justify-center group-hover:shadow-orange-500/20 transition-all">
                   <div className="absolute inset-0 bg-gradient-to-tl from-orange-500/5 to-transparent"></div>
                   <ServerCrash className="w-32 h-32 text-orange-500/20 group-hover:text-orange-500/40 group-hover:scale-110 transition-all duration-700" />
                 </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 5 */}
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-center gap-12 group">
              <div className="flex-1 space-y-6">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                  <Archive className="w-8 h-8" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-text-base">{t('landingFeature5Title')}</h3>
                <p className="text-lg text-text-muted leading-relaxed">
                  {t('landingFeature5Desc')}
                </p>
              </div>
              <div className="flex-1 w-full">
                 <div className="w-full aspect-[4/3] md:aspect-video bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl overflow-hidden relative flex items-center justify-center group-hover:shadow-emerald-500/20 transition-all">
                   <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
                   <Archive className="w-32 h-32 text-emerald-500/20 group-hover:text-emerald-500/40 group-hover:scale-110 transition-all duration-700" />
                 </div>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-primary tracking-widest uppercase mb-3">
              {t('landingPricingSectionTitle')}
            </h2>
            <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight text-text-base mb-6">
              {t('landingPricingSectionSubtitle')}
            </h3>
            <p className="text-lg text-text-muted max-w-3xl mx-auto leading-relaxed bg-bg-surface p-6 rounded-2xl border border-border-base">
              {t('landingPricingPhilosophy')}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          
          {/* Developer Tier */}
          <ScrollReveal delay={100}>
            <div className="bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl p-8 flex flex-col h-full">
              <div className="mb-8">
                <h4 className="text-xl font-bold text-text-base mb-2">{t('landingPricingDevTier')}</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-text-base">{t('landingPricingDevPrice')}</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {[1, 2, 3, 4].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-text-muted">{t(`landingPricingDevFeature${i}`)}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="w-full bg-bg-base border border-border-base hover:border-primary/50 text-text-base px-6 py-3 rounded-xl font-medium transition-all text-center"
              >
                {t('landingPricingStartFree')}
              </Link>
            </div>
          </ScrollReveal>

          {/* Pro Tier (Highlighted) */}
          <ScrollReveal delay={200}>
            <div className="bg-bg-base border-2 border-primary rounded-3xl p-8 shadow-2xl shadow-primary/20 flex flex-col h-[105%] relative z-10 scale-105">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="bg-gradient-to-r from-primary to-purple-500 text-white text-sm font-bold tracking-wide uppercase px-4 py-1 rounded-full">
                  {t('landingPricingMostPopular')}
                </span>
              </div>
              <div className="mb-8 mt-2">
                <h4 className="text-xl font-bold text-primary mb-2">{t('landingPricingProTier')}</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-text-base">{t('landingPricingProPrice')}</span>
                  <span className="text-text-muted">{t('landingPricingProPeriod')}</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {[1, 2, 3, 4].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-text-base font-medium">{t(`landingPricingProFeature${i}`)}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="w-full bg-primary hover:bg-primary/90 text-white px-6 py-4 rounded-xl font-medium transition-all text-center shadow-lg shadow-primary/25 hover:shadow-primary/40"
              >
                {t('landingPricingGetPro')}
              </Link>
            </div>
          </ScrollReveal>

          {/* Enterprise Tier */}
          <ScrollReveal delay={300}>
            <div className="bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-3xl p-8 flex flex-col h-full">
              <div className="mb-8">
                <h4 className="text-xl font-bold text-text-base mb-2">{t('landingPricingEntTier')}</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-text-base">{t('landingPricingEntPrice')}</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {[1, 2, 3, 4].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span className="text-text-muted">{t(`landingPricingEntFeature${i}`)}</span>
                  </li>
                ))}
              </ul>
              <a
                href="mailto:sales@orchestrack.com"
                className="w-full bg-bg-base border border-border-base hover:border-purple-500/50 text-text-base px-6 py-3 rounded-xl font-medium transition-all text-center"
              >
                {t('landingPricingContactUs')}
              </a>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* About & Architecture Section */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <ScrollReveal>
          <div className="text-center mb-16 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-text-base mb-6">
              {t('landingAboutMissionTitle')}
            </h2>
            <p className="text-lg md:text-xl text-text-muted leading-relaxed">
              {t('landingAboutMissionDesc')}
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-20">
          <ScrollReveal>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-text-base mb-10 text-center">
              {t('landingAboutArchTitle')}
            </h3>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Agent */}
            <ScrollReveal delay={100}>
              <div className="bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-2xl p-6 hover:shadow-[0_0_35px_var(--tw-shadow-color)] hover:shadow-primary/20 hover:-translate-y-1 transition-all group h-full">
                <Cpu className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h4 className="text-lg font-bold text-text-base mb-2">{t('landingAboutArch1Title')}</h4>
                <p className="text-sm text-text-muted leading-relaxed">{t('landingAboutArch1Desc')}</p>
              </div>
            </ScrollReveal>
            {/* NATS */}
            <ScrollReveal delay={200}>
              <div className="bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-2xl p-6 hover:shadow-[0_0_35px_var(--tw-shadow-color)] hover:shadow-purple-500/20 hover:-translate-y-1 transition-all group h-full">
                <Radio className="w-10 h-10 text-purple-500 mb-4 group-hover:scale-110 transition-transform" />
                <h4 className="text-lg font-bold text-text-base mb-2">{t('landingAboutArch2Title')}</h4>
                <p className="text-sm text-text-muted leading-relaxed">{t('landingAboutArch2Desc')}</p>
              </div>
            </ScrollReveal>
            {/* API */}
            <ScrollReveal delay={300}>
              <div className="bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-2xl p-6 hover:shadow-[0_0_35px_var(--tw-shadow-color)] hover:shadow-blue-500/20 hover:-translate-y-1 transition-all group h-full">
                <Database className="w-10 h-10 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
                <h4 className="text-lg font-bold text-text-base mb-2">{t('landingAboutArch3Title')}</h4>
                <p className="text-sm text-text-muted leading-relaxed">{t('landingAboutArch3Desc')}</p>
              </div>
            </ScrollReveal>
            {/* Dashboard */}
            <ScrollReveal delay={400}>
              <div className="bg-bg-surface shadow-[0_0_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-2xl p-6 hover:shadow-[0_0_35px_var(--tw-shadow-color)] hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all group h-full">
                <LayoutDashboard className="w-10 h-10 text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
                <h4 className="text-lg font-bold text-text-base mb-2">{t('landingAboutArch4Title')}</h4>
                <p className="text-sm text-text-muted leading-relaxed">{t('landingAboutArch4Desc')}</p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA Signup Form Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <ScrollReveal>
          <div className="bg-gradient-to-br from-primary/10 via-bg-base to-purple-500/10 border border-primary/20 rounded-3xl p-10 md:p-16 text-center max-w-4xl mx-auto shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
            
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-8 text-text-base relative z-10">
              {t('landingSignupHeader')}
            </h2>
            
            <form onSubmit={handleSignupSubmit} className="relative z-10 flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto justify-center mb-6">
              <input
                type="email"
                required
                placeholder={t('landingSignupPlaceholder')}
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="flex-1 bg-bg-base border border-border-base rounded-xl px-6 py-4 text-lg text-text-base placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner"
              />
              <button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl text-lg font-medium transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95 flex items-center justify-center whitespace-nowrap"
              >
                {t('landingSignupButton')} &rarr;
              </button>
            </form>
            
            <p className="text-sm text-text-muted relative z-10">
              {t('landingSignupGuarantee')}
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="bg-bg-surface border-t border-border-base pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo-dark.png" alt="Orchestrack" className="h-6 w-auto dark:block hidden" />
                <img src="/logo-light.png" alt="Orchestrack" className="h-6 w-auto dark:hidden block" />
                <span className="font-bold text-xl tracking-tight text-text-base">Orchestrack</span>
              </div>
              <p className="text-sm text-text-muted pr-4">
                {t('landingAboutMissionDesc')}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-text-base mb-4">{t('footerProduct')}</h4>
              <ul className="space-y-3 text-sm text-text-muted">
                <li><a href="#" className="hover:text-primary transition-colors">{t('footerFeatures')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footerSolutions')}</a></li>
                <li><a href="#pricing" className="hover:text-primary transition-colors">{t('footerPricing')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-text-base mb-4">{t('footerResources')}</h4>
              <ul className="space-y-3 text-sm text-text-muted">
                <li><a href="#" className="hover:text-primary transition-colors">{t('footerDocumentation')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footerStatus')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-text-base mb-4">{t('footerLegal')}</h4>
              <ul className="space-y-3 text-sm text-text-muted">
                <li><a href="#" className="hover:text-primary transition-colors">{t('footerTerms')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footerPrivacy')}</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border-base text-center text-sm text-text-muted flex justify-center">
            <p>{t('footerCopyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
